---

```markdown
<!-- prd.md -->

# AppsFlyer Cohort Data Platform PRD

版本：v0.1
作者：你 + AI 助手
目标：支撑 v2 + v3 中的所有「安全线 / 风险等级 / 操作评分」逻辑

---

## 1. 背景与目标

### 1.1 背景

当前你已经有：

- 一个基于 Google Ads ChangeEvent 的「变更监控系统」（v1）
- 一套业务方法论：
  - 安全线（基于 180 天前 cohort 的 ROAS7 / RET7）
  - Campaign 五级状态（危险 / 预警 / 观察 / 健康 / 优秀）
  - Test / Mature 分层
  - 操作评分（T+7 评估这次加预算 / 调策略是加分还是扣分）（v2）
- 对 AppsFlyer 数据的初步接入经验（IAP raw / Ad revenue raw / Master API）（v3 初稿）

但目前还没有一套**干净、可迭代的「cohort 数据平台」**，所有东西都停留在 CSV + 手动分析层面。

### 1.2 目标

构建一个最小可用的 **AppsFlyer cohort 数据平台**，能够：

1. 每天自动从 AppsFlyer 拉取：
   - IAP 事件（iap_purchase）
   - 广告收入事件（af_ad_revenue）
   - 按 install_date 聚合的 cost + installs + retention_rate_day_1/3/5/7
2. 将数据标准化写入 PostgreSQL，并暴露一个统一的「cohort metrics」视图：
   - 维度：`app_id + geo + media_source + campaign + adset + install_date + days_since_install`
   - 指标：`iap_revenue_usd, ad_revenue_usd, total_revenue_usd, installs, cost_usd, retention_rate`
3. 为 v2/v3 提供计算基础：
   - ROAS_D1/D3/D5/D7
   - RET_D1/D3/D5/D7
   - 安全线（基于历史窗口的 baseline）
   - Campaign 风险等级
   - 优化师操作评分

---

## 2. 范围与非目标

### 2.1 范围内

- AppsFlyer 数据管道：
  - 拉取：IAP raw / Ad revenue raw / Master-Agg cost+retention
  - 标准化、落库、幂等写入
- 数据模型设计：
  - Event-level：`af_events`
  - Cohort-level：`af_cohort_kpi_daily`
  - Metrics 视图：`af_revenue_cohort_daily` / `af_cohort_metrics_daily`
- 最小指标集合：
  - 收入：IAP + Ad revenue（USD）
  - 成本：Cohort 级别 cost（USD）
  - 安装：installs
  - 留存：D1/D3/D5/D7 retention_rate
- 和上层系统的接口设计（查询方向）：
  - v2 安全线系统
  - v3 评分系统（操作评分、Campaign 状态）

### 2.2 非范围目标（未来可能版本）

- Web UI（Dashboard）实现细节（仅定义数据接口，不约束前端）
- 跨 App / 跨渠道的自动命名规范修复（V2 再考虑）
- 复杂 attribution 模型（优先使用 AppsFlyer 默认 attribution）

---

## 3. 数据源与 API 设计

### 3.1 数据源概览

1. **AppsFlyer Raw IAP Events**
   Endpoint（现用）：
   - `/api/raw-data/export/app/{app_id}/in_app_events_report/v5`
   - 过滤条件：`event_name=iap_purchase`, `media_source`, `geo`, `from`, `to`
   - 返回：CSV，每行一个事件

2. **AppsFlyer Raw Ad Revenue Events**
   Endpoint（现用）：
   - `/api/raw-data/export/app/{app_id}/ad_revenue_raw/v5`
   - 过滤条件：`media_source`, `geo`, `from`, `to`
   - 返回：CSV，每行一个广告收入事件

3. **AppsFlyer Master Agg Data**
   Endpoint（现用）：
   - `/api/master-agg-data/v4/app/{app_id}`
   - 查询形式：`from=YYYY-MM-DD&to=YYYY-MM-DD`（同一天）
   - `groupings=pid,c,geo`
   - `kpis=cost,installs,retention_rate_day_1,retention_rate_day_3,retention_rate_day_5,retention_rate_day_7`
   - 过滤：`filters=pid={media_source};geo={geo}`
   - 返回：JSON，每行一个 `(pid, c, geo)` 组合在该 install_date cohort 上的指标

> 设计假设：
> - 当 `from=to=install_date` 时，Master-Agg 返回的是**该天安装 cohort 的聚合**。
> - retention_rate_day_N 代表「安装 N 天后仍活跃的用户比例」。

### 3.2 数据拉取策略

#### 3.2.1 Raw events（IAP + Ad Revenue）

- 粒度：按「事件发生时间窗口」拉数据
- 典型调用：
  - 每天拉前 1 天：`from=yesterday, to=yesterday`
  - 或一次性拉：`from=2025-11-01, to=2025-11-20`

#### 3.2.2 Cohort KPI（cost + retention）

- 粒度：按 `install_date` 维度逐天拉取
- 每天定时任务（例如 09:00）执行：

  - 对于 `install_date = today - 1`：刷新 D1 retention
  - 对于 `install_date = today - 3`：刷新 D3
  - 对于 `install_date = today - 5`：刷新 D5
  - 对于 `install_date = today - 7`：刷新 D7 + cost（或在 D0 时已写入）

  实现上可以简单一点：
  - 每天对 `install_date ∈ [today-7, today-1]` 的所有日期执行一次 `fetch_master_agg_for_install_date`，
    然后以 `ON CONFLICT DO UPDATE` 方式写入。
  - 这样不必特别区分「哪天刚好是 D3 / D5 / D7」，由 API 决定返回。

---

## 4. 数据模型设计

### 4.1 事件明细表 `af_events`

#### 4.1.1 作用

- 单一事实表，统一存储两类关键收入事件：
  - `event_name = 'iap_purchase'`：IAP 收入
  - `event_name = 'af_ad_revenue'`：广告收入
- 保留：
  - 安装时间 / 事件时间 / 国家 / 渠道 / Campaign / Adset 等维度
  - event-level 收入数值
- 上层所有 cohort 收入计算都基于这个表聚合。

#### 4.1.2 核心字段解释

- `event_id`：
  - 由 `(AppsFlyer ID, Event Time, event_name, Event Revenue USD)` 哈希生成
  - 作为主键，保证去重 & 幂等
- `install_date` / `event_date`：
  - 都是 DATE 类型，用于分区、过滤和 join
- `days_since_install`：
  - `floor((event_time - install_time)/1d)`，下限为 0
  - 用于 cohort 维度的时间轴统一
- 收入相关：
  - `event_revenue_usd`：统一货币后的收入（IAP or Ad）
  - `event_revenue`：原币种金额（可选）
  - `event_revenue_currency`：原币种

---

### 4.2 Cohort KPI 表 `af_cohort_kpi_daily`

#### 4.2.1 作用

- 把 Master-Agg / Cohort API 里已经预聚合好的：
  - installs
  - cost
  - retention_rate_day_1/3/5/7
- 转换为与事件收入同一套「cohort 时间坐标体系」：
  - 维度：`app_id, media_source, campaign, geo, install_date, days_since_install`
  - 指标：
    - D0：`installs`, `cost_usd`
    - D1/3/5/7：`retention_rate`（以及同 cohort 的 installs）

#### 4.2.2 用法

- 对于某个 cohort `(app, geo, media_source, campaign, adset, install_date)`：
  - `af_events` 提供每天的 IAP/Ad 收入
  - `af_cohort_kpi_daily` 提供安装数 / 成本 / 每日留存率
- 组合成 `af_cohort_metrics_daily` 视图，供 v2/v3 消费。

---

### 4.3 派生视图：`af_revenue_cohort_daily` & `af_cohort_metrics_daily`

#### 4.3.1 `af_revenue_cohort_daily`

- 来自 `af_events` 的 GROUP BY：
  - 维度：`app_id, geo, media_source, campaign, adset, install_date, days_since_install`
  - 指标：`iap_revenue_usd, ad_revenue_usd, total_revenue_usd`

#### 4.3.2 `af_cohort_metrics_daily`

- `af_revenue_cohort_daily` LEFT JOIN `af_cohort_kpi_daily`：
  - 输出：
    - 收入：IAP / Ad / Total
    - 安装：installs
    - 成本：cost_usd
    - 留存：retention_rate

> **原则**：
> 上层所有业务逻辑（安全线、风险等级、评分）只看 `af_cohort_metrics_daily`，
> 不直接碰 event-level 表，减少耦合。

---

## 5. ETL 流程设计

### 5.1 每日任务（建议）

每天 2 个 cron job（都可以用同一个脚本不同参数）：

1. **事件拉取 job**（例如每天 03:00）

   - 目标时间窗口：`yesterday`
   - 步骤：
     1. 调用 IAP raw API：`from=to=yesterday`
     2. 调用 Ad revenue raw API：`from=to=yesterday`
     3. 解析 CSV → DataFrame
     4. 规范化字段（解析时间 / install_date / days_since_install / 生成 event_id）
     5. Upsert 到 `af_events`

2. **cohort KPI job**（例如每天 04:00）

   - 目标 install_date 范围：`[today-7, today-1]`
   - 步骤：
     1. 对该范围内每一天 `install_date`：
        - 调 master-agg API：`from=to=install_date`
        - 展开成 D0/D1/D3/D5/D7 多行
        - Upsert 到 `af_cohort_kpi_daily`（幂等更新）

> 这样设计的好处：
> - 即使某天 job 掉线，下一次再跑同一时间范围，`ON CONFLICT DO UPDATE` 会修正数据。
> - retention 这种「慢慢长出来」的指标，每次 API 返回的值会被最新值覆盖。

---

## 6. 指标定义与业务语义

### 6.1 Cohort 收入与 ROAS

在 `af_cohort_metrics_daily` 视图基础上：

- 某 cohort 在 Dn 的 **累计收入**：

  ```sql
  SELECT
    app_id, geo, media_source, campaign, adset, install_date,
    days_since_install,
    SUM(total_revenue_usd) OVER (
      PARTITION BY app_id, geo, media_source, campaign, adset, install_date
      ORDER BY days_since_install
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cum_revenue_usd
  FROM af_cohort_metrics_daily
  WHERE days_since_install <= 7;

- 某 cohort 的 ROAS_D7：

  ```sql
    SELECT
    app_id, geo, media_source, campaign, adset, install_date,
    cum_revenue_usd / NULLIF(MAX(cost_usd) OVER (...), 0) AS roas_d7
    FROM (...上面的窗口查询...)
    WHERE days_since_install = 7;

约定：
•	cost_usd 对同一 cohort 始终记在 days_since_install = 0（或 Master API 提供的 D0）。
•	计算时取该 cohort 的 MAX(cost_usd) 即可。

6.2 留存 RET_Dn
	•	来自 af_cohort_kpi_daily 的 retention_rate：
	•	days_since_install = 1 → RET1
	•	days_since_install = 3 → RET3
	•	days_since_install = 5 → RET5
	•	days_since_install = 7 → RET7

6.3 安全线与达成率概念（v2 对应）

6.3.1 安全线（Baseline）数据来源
	•	窗口：[today-210, today-180] 的 cohort
	•	维度优先级：
	1.	app_id + geo + media_source
	2.	app_id + geo
	3.	app_id + media_source
	4.	app_id
	•	指标：
	•	baseline_roas_d7：该窗口内 ROAS_D7 的中位数（P50）
	•	baseline_ret7：该窗口内 RET7 的中位数（P50）

6.3.2 达成率
对于任意 cohort：
	•	roas_achievement = roas_d7 / baseline_roas_d7
	•	ret_achievement = ret7 / baseline_ret7
	•	min_achievement = LEAST(roas_achievement, ret_achievement)

6.4 Campaign 级别评价与风险等级

用 cohort 的加权聚合组成 Campaign 级别指标。

	•	某 Campaign 在某段「安装日期窗口」内的表现：
	•	将对应 cohorts 的指标按成本加权平均：
  ```sql
    weighted_roas_d7 = SUM(roas_d7 * cost_usd) / SUM(cost_usd)
    weighted_ret7    = SUM(ret7 * installs) / SUM(installs)

## 风险等级射（MVP建议）

| min_achievement 区间 | risk_level | 建议动作 |
|---------------------|------------|---------|
| < 0.6 | danger | 停止/大幅缩量 |
| 0.6 - 0.85 | warning | 缩量/控制预算 |
| 0.85 - 1.0 | observe | 保持观望，不扩不缩 |
| 1.0 - 1.1 | healthy | 稳健扩量 |
| >= 1.1 | excellent | 积极扩量/重点支持 |


7. 操作评分系统接口（与 v1 变更监控结合）

虽然本 PRD 不直接实现评分逻辑，但需要定义「cohort 数据」如何支撑评分。

7.1 变更监控系统提供的输入

来自 Google Ads ChangeEvent 系统（v1）：
	•	操作信息：
	•	operator（执行人）
	•	操作时间 change_time
	•	目标 Campaign / Adset / Ad 标识
	•	操作类型（加预算 / 降预算 / 出价策略切换 / 新建素材等）

7.2 评分所需的 Cohort 数据

对于一次针对 Campaign 的操作（比如加预算）：
	•	观察窗口：[change_time, change_time + 7days] 内新增 install 的 cohorts
	•	对这些 cohorts：
	•	计算 ROAS_D7 / RET7 / min_achievement
	•	与安全线比较，得到这次操作的评分

依赖：
	•	af_cohort_metrics_daily 提供 install_date ~ D7 的全部指标
	•	安全线系统提供 baseline_roas_d7 / baseline_ret7

7.3 后续扩展（非本次实现）
	•	operation_scores 表：
	•	operation_id, operator, campaign, change_time, score_stage(T+7), final_score, is_bold_success 等
	•	Optimize：根据 T+7 数据打分，和历史平均对比，做优化师排行榜。

8. 系统架构与实现要点

8.1 组件
	1.	Python ETL 脚本（本次已提供 sync_af_data.py）：
	•	替代原来的三个“只存 CSV”脚本
	•	支持命令行参数（后续可加 argparse）
	2.	PostgreSQL：
	•	schema：af_events, af_cohort_kpi_daily
	•	可选视图：af_revenue_cohort_daily, af_cohort_metrics_daily
	3.	TypeScript + Drizzle ORM：
	•	schema：afEvents, afCohortKpiDaily
	•	用于：
	•	Next.js API routes / tRPC 查询
	•	安全线计算服务 / 评分服务的 数据访问层

8.2 非功能性要求
	•	幂等性：
	•	所有写操作都用 ON CONFLICT DO NOTHING 或 DO UPDATE 实现幂等
	•	允许重复拉取同一时间窗口数据，而不产生重复记录
	•	安全性：
	•	AppsFlyer API token / DB 密码必须只存在于 .env 或 Secret Manager 中
	•	Python/TS 代码中不得硬编码 token
	•	性能：
	•	事件量：当前产品量级下，每日 raw events 数在 1e4 级别以内，execute_values 足够
	•	视图查询：增加必要索引（本 PRD 已定义）
	•	可靠性：
	•	Cron Job 失败时，支持后续补跑（时间窗口可配置）

⸻

9. MVP 范围与迭代计划

9.1 MVP（第一阶段）
	•	产品范围：
	•	只支持 Solitaire 这个 App
	•	只支持 geo = US
	•	只支持 media_source = googleadwords_int
	•	要求达成：
	1.	每天自动更新：
	•	af_events（IAP + Ad revenue）
	•	af_cohort_kpi_daily（cost + RET1/3/5/7）
	2.	能用 SQL 查询任意：
	•	某个 Campaign、某段 install_date 的 ROAS_D7 + RET7
	3.	能手动跑出一版安全线：
	•	180~210 天前的 baseline_roas_d7 / baseline_ret7

9.2 第二阶段：对接 v2/v3 逻辑
	•	在后端（TS/Node 或 Python）实现：
	•	安全线计算服务（定期刷新 baseline）
	•	Campaign 级别状态计算（五档风险）
	•	初版 operation_scores 表 + 评分逻辑（T+7）

9.3 第三阶段：扩展维度与 UI
	•	扩展到：
	•	多 geo
	•	多 media_source
	•	其他 App
	•	前端 Dashboard：
	•	Cohort 收入 & ROAS 曲线
	•	安全线对比
	•	操作评分 & 排行榜

10. 风险与开放问题
	1.	Master-Agg API 语义确认
	•	假设 from=to=install_date 时返回的是「该 install_date 的 cohort」
	•	需要实际对比 AppsFlyer Dashboard 做一次 sanity check：
	•	同一条件下，仪表盘上的 D1/D3/D7 留存是否与 master-agg 返回一致
	2.	时区问题
	•	AppsFlyer 的 raw CSV 默认时区配置可能由 app 决定
	•	需要确认：
	•	安装时间 & 事件时间的时区是否与你业务分析用的一致（建议统一为 UTC）
	3.	cohort cost 精度
	•	Master-Agg 返回的 cost 是按 install_date 聚合，还是按 event_date？
	•	若有偏差，可能需要额外使用 performance/cost 报表进行修正
	4.	命名规范
	•	Google Ads Campaign 名称 与 AppsFlyer Campaign 字段要尽量一致
	•	否则不同系统之间做 Mapping 时需要单独一张 campaign_mapping 表

⸻

11. 收尾

这份 PRD 的全部目的，是把「如何从 AppsFlyer 建一个可用的 cohort 数据层」讲清楚，让你：
	•	可以用一条 Python 脚本，把“四张 CSV”时代彻底淘汰掉
	•	任何时候想看某个 Campaign / Cohort 的 ROAS/RET，都只需要一条 SQL / 一个 API 调用

之后 v2/v3 的安全线、评分、扩量/缩量策略，就不再是拍脑袋，而是实打实建立在这层数据之上。

---

你现在可以先把 `src.md` 里的 SQL 在本地建表，把 Python 脚本跑一遍，只支持 solitaire + US + googleadwords_int 这一条线就够了。等这条线跑顺、cohort 数据稳定了，我们再往上面挂安全线和评分引擎，那时候调整参数就会变成「用数据调参」，而不是「靠感觉瞎猜」。
