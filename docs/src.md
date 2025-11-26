<!-- src.md -->

# AppsFlyer Cohort Data Pipeline Source

本文件包含三部分：

1. PostgreSQL 数据表 schema（DDL）
2. Drizzle ORM schema（TypeScript）
3. Python ETL 脚本：从 AppsFlyer API 拉取 + 处理 + 写入 PostgreSQL

---

## 1. PostgreSQL Schema（DDL）

> 目标：
> - `af_events`：统一存 iap_purchase + af_ad_revenue 两类事件
> - `af_cohort_kpi_daily`：按 install_date × days_since_install 存 cohort 级别的 installs + cost + retention

### 1.1 事件明细表：`af_events`

```sql
CREATE TABLE IF NOT EXISTS af_events (
  event_id              TEXT PRIMARY KEY,             -- 去重主键（md5 生成）

  imported_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  app_id                TEXT NOT NULL,
  app_name              TEXT,
  bundle_id             TEXT,

  appsflyer_id          TEXT,                         -- "AppsFlyer ID"
  event_name            TEXT NOT NULL,                -- 'iap_purchase' / 'af_ad_revenue'
  event_time            TIMESTAMPTZ NOT NULL,
  event_date            DATE NOT NULL,

  install_time          TIMESTAMPTZ NOT NULL,
  install_date          DATE NOT NULL,
  days_since_install    INTEGER NOT NULL,             -- floor((event_time - install_time)/1d)，下限 0

  event_revenue         NUMERIC(18,6),
  event_revenue_usd     NUMERIC(18,6),
  event_revenue_currency TEXT,

  geo                   TEXT,                          -- Changed from country_code for consistency
  media_source          TEXT,
  channel               TEXT,
  campaign              TEXT,
  campaign_id           TEXT,
  adset                 TEXT,
  adset_id              TEXT,
  ad                    TEXT,

  is_primary_attribution BOOLEAN,

  raw_payload           JSONB                          -- 原始行 JSON（可选）
);

CREATE INDEX IF NOT EXISTS idx_af_events_install_date
  ON af_events (install_date);

CREATE INDEX IF NOT EXISTS idx_af_events_event_date
  ON af_events (event_date);

CREATE INDEX IF NOT EXISTS idx_af_events_cohort
  ON af_events (app_id, geo, media_source, campaign, adset, install_date);

CREATE INDEX IF NOT EXISTS idx_af_events_event_name
  ON af_events (event_name);
```

### **1.2 Cohort KPI 表：****af_cohort_kpi_daily**

> 从 Master Agg / Cohort API 中，把 cost + installs + retention_rate_day_N 拆成
>
> install_date + days_since_install 的窄表形式

约定：

- days_since_install = 0：

    - installs = cohort 安装数
    - cost_usd = cohort 总成本
    - retention_rate 通常为 NULL

- days_since_install = 1 / 3 / 5 / 7：

    - retention_rate = 对应天留存率

    - installs = cohort 总安装数（方便后续算人数）

    - cost_usd 通常为 NULL（成本记在 D0）



```sql
CREATE TABLE IF NOT EXISTS af_cohort_kpi_daily (
  app_id               TEXT   NOT NULL,
  media_source         TEXT   NOT NULL,         -- pid
  campaign             TEXT   NOT NULL,         -- c
  geo                  TEXT   NOT NULL,         -- GEO / country

  install_date         DATE   NOT NULL,
  days_since_install   INTEGER NOT NULL,        -- 0 / 1 / 3 / 5 / 7

  installs             INTEGER,                 -- cohort 总安装（同一 cohort 不同 day 一般相同）
  cost_usd             NUMERIC(18,6),           -- 记在 days_since_install = 0
  retention_rate       NUMERIC(8,4),            -- 比如 0.3571

  last_refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (app_id, media_source, campaign, geo, install_date, days_since_install)
);

CREATE INDEX IF NOT EXISTS idx_af_cohort_kpi_install_date
  ON af_cohort_kpi_daily (install_date);

CREATE INDEX IF NOT EXISTS idx_af_cohort_kpi_cohort
  ON af_cohort_kpi_daily (app_id, geo, media_source, campaign, install_date);

2. Drizzle ORM Schema（TypeScript）

假设你使用的是 drizzle-orm/pg-core + Node.js

2.1 af_events 的 Drizzle 定义

// db/schema/afEvents.ts
import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  boolean,
  jsonb,
  date as dateType,
  index,
} from "drizzle-orm/pg-core";

export const afEvents = pgTable(
  "af_events",
  {
    eventId: text("event_id").primaryKey(),

    importedAt: timestamp("imported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    appId: text("app_id").notNull(),
    appName: text("app_name"),
    bundleId: text("bundle_id"),

    appsflyerId: text("appsflyer_id"),
    eventName: text("event_name").notNull(),
    eventTime: timestamp("event_time", { withTimezone: true }).notNull(),
    eventDate: dateType("event_date").notNull(),

    installTime: timestamp("install_time", { withTimezone: true }).notNull(),
    installDate: dateType("install_date").notNull(),
    daysSinceInstall: integer("days_since_install").notNull(),

    eventRevenue: numeric("event_revenue", { precision: 18, scale: 6 }),
    eventRevenueUsd: numeric("event_revenue_usd", { precision: 18, scale: 6 }),
    eventRevenueCurrency: text("event_revenue_currency"),

    geo: text("geo"),  // Changed from countryCode for consistency
    mediaSource: text("media_source"),
    channel: text("channel"),
    campaign: text("campaign"),
    campaignId: text("campaign_id"),
    adset: text("adset"),
    adsetId: text("adset_id"),
    ad: text("ad"),

    isPrimaryAttribution: boolean("is_primary_attribution"),

    rawPayload: jsonb("raw_payload"),
  },
  (table) => ({
    idxInstallDate: index("idx_af_events_install_date").on(table.installDate),
    idxEventDate: index("idx_af_events_event_date").on(table.eventDate),
    idxCohort: index("idx_af_events_cohort").on(
      table.appId,
      table.geo,
      table.mediaSource,
      table.campaign,
      table.adset,
      table.installDate,
    ),
    idxEventName: index("idx_af_events_event_name").on(table.eventName),
  }),
);


2.2 af_cohort_kpi_daily 的 Drizzle 定义

// db/schema/afCohortKpiDaily.ts
import {
  pgTable,
  text,
  timestamp,
  numeric,
  integer,
  date as dateType,
  index,
} from "drizzle-orm/pg-core";

export const afCohortKpiDaily = pgTable(
  "af_cohort_kpi_daily",
  {
    appId: text("app_id").notNull(),
    mediaSource: text("media_source").notNull(),
    campaign: text("campaign").notNull(),
    geo: text("geo").notNull(),

    installDate: dateType("install_date").notNull(),
    daysSinceInstall: integer("days_since_install").notNull(),

    installs: integer("installs"),
    costUsd: numeric("cost_usd", { precision: 18, scale: 6 }),
    retentionRate: numeric("retention_rate", { precision: 8, scale: 4 }),

    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: index("af_cohort_kpi_daily_pk").on(
      table.appId,
      table.mediaSource,
      table.campaign,
      table.geo,
      table.installDate,
      table.daysSinceInstall,
    ),
    idxInstallDate: index("idx_af_cohort_kpi_install_date").on(
      table.installDate,
    ),
    idxCohort: index("idx_af_cohort_kpi_cohort").on(
      table.appId,
      table.geo,
      table.mediaSource,
      table.campaign,
      table.installDate,
    ),
  }),
);
注意：
Drizzle 里真正的 PRIMARY KEY 可以在迁移脚本里单独声明，
这里用 index 定义一个等价组合索引，方便查询。
如果你用 Drizzle Migrations，可以在迁移文件中显式加上 PRIMARY KEY(...)。


3. Python ETL 脚本：从 API 到 PostgreSQL

单文件示例：sync_af_data.py
功能：
	•	拉取 IAP 事件（iap_purchase）
	•	拉取广告收入事件（af_ad_revenue）
	•	按 install_date 调 master-agg API，写入 cohort cost + retention
	•	写入 PostgreSQL 中的 af_events 与 af_cohort_kpi_daily

3.1 依赖与环境变量

使用的库：
pip install requests pandas psycopg2-binary python-dotenv
推荐把敏感信息放到 .env（不要提交到 git）：
AF_API_TOKEN=your_af_bearer_token
AF_APP_ID=solitaire.patience.card.games.klondike.free
AF_DEFAULT_MEDIA_SOURCE=googleadwords_int
AF_DEFAULT_GEO=US

PG_HOST=localhost
PG_PORT=5432
PG_USER=your_user
PG_PASSWORD=your_password
PG_DATABASE=your_db

3.2 完整的Python脚本

Python ETL脚本位置: `server/appsflyer/sync_af_data.py`

依赖安装: `pip install -r server/appsflyer/requirements.txt`


4. 后续衍生视图（示意）

不是必须写进 schema，但你可以在 SQL 层做一个 cohort 收入视图，和 KPI 表 join 在一起。

CREATE VIEW af_revenue_cohort_daily AS
SELECT
  app_id,
  geo,
  media_source,
  campaign,
  adset,
  install_date,
  days_since_install,
  SUM(CASE WHEN event_name = 'iap_purchase' THEN event_revenue_usd ELSE 0 END) AS iap_revenue_usd,
  SUM(CASE WHEN event_name = 'af_ad_revenue' THEN event_revenue_usd ELSE 0 END) AS ad_revenue_usd,
  SUM(event_revenue_usd) AS total_revenue_usd
FROM af_events
GROUP BY
  app_id, geo, media_source, campaign, adset, install_date, days_since_install;

再加一个把 revenue + cohort KPI 拼在一起的 metrics 视图（后面在 PRD 里会用到）：
CREATE VIEW af_cohort_metrics_daily AS
SELECT
  r.app_id,
  r.geo,
  r.media_source,
  r.campaign,
  r.adset,
  r.install_date,
  r.days_since_install,
  r.iap_revenue_usd,
  r.ad_revenue_usd,
  r.total_revenue_usd,
  k.installs,
  k.cost_usd,
  k.retention_rate
FROM af_revenue_cohort_daily r
LEFT JOIN af_cohort_kpi_daily k
  ON r.app_id = k.app_id
 AND r.geo = k.geo
 AND r.media_source = k.media_source
 AND r.campaign = k.campaign
 AND r.install_date = k.install_date
 AND r.days_since_install = k.days_since_install;

这个视图就是你后面 v2/v3 所有「ROAS / RET / 安全线 / 评分」计算的统一入口。
