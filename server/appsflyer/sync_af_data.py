# sync_af_data.py

import os
import io
import hashlib
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Iterable

import requests
import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# 环境与配置
# -----------------------------------------------------------------------------

load_dotenv()

AF_API_TOKEN = os.environ["AF_API_TOKEN"]
AF_APP_ID = os.environ["AF_APP_ID"]

AF_BASE_URL = "https://hq1.appsflyer.com/api"
AF_MEDIA_SOURCE_DEFAULT = os.getenv("AF_DEFAULT_MEDIA_SOURCE", "googleadwords_int")
AF_GEO_DEFAULT = os.getenv("AF_DEFAULT_GEO", "US")

PG_CONN_INFO = {
    "host": os.environ["PG_HOST"],
    "port": int(os.getenv("PG_PORT", "5432")),
    "user": os.environ["PG_USER"],
    "password": os.environ["PG_PASSWORD"],
    "dbname": os.environ["PG_DATABASE"],
}


def get_pg_connection():
    return psycopg2.connect(**PG_CONN_INFO)


COMMON_HEADERS = {
    "authorization": f"Bearer {AF_API_TOKEN}",
}


# -----------------------------------------------------------------------------
# 工具函数
# -----------------------------------------------------------------------------

def parse_datetime_utc(x: str) -> Optional[datetime]:
    """
    AppsFlyer 的时间通常是类似 "2025-11-01 12:34:56" 或 "2025/11/01 12:34:56"。
    这里做一个宽松解析，并统一为 UTC（先当作 naive，再设为 UTC）。
    """
    if not isinstance(x, str) or not x.strip():
        return None
    x = x.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            dt = datetime.strptime(x, fmt)
            # 如果没有 tz 信息，就直接当 UTC
            if dt.tzinfo is None:
                return dt.replace(tzinfo=None)
            return dt.astimezone(tz=None)
        except ValueError:
            continue
    return None


def compute_days_since_install(install_time: datetime, event_time: datetime) -> int:
    """
    计算 floor((event_time - install_time)/1d)，并且下限为 0。
    """
    delta = event_time - install_time
    days = int(delta.total_seconds() // 86400)
    if days < 0:
        return 0
    return days


def generate_event_id(row: pd.Series) -> str:
    """
    用 AppsFlyer ID + event_time + event_name + revenue_usd 拼一个 md5 作为主键。
    """
    parts = [
        str(row.get("AppsFlyer ID", "")),
        str(row.get("Event Time Parsed", "")),
        str(row.get("event_name", "")),
        str(row.get("Event Revenue USD", "")),
    ]
    raw = "|".join(parts)
    return hashlib.md5(raw.encode("utf-8")).hexdigest()


# -----------------------------------------------------------------------------
# 1. 拉取 IAP / Ad Revenue Raw Data
# -----------------------------------------------------------------------------

def fetch_raw_events_csv(
    event_type: str,
    from_date: str,
    to_date: str,
    media_source: str,
    geo: str,
) -> pd.DataFrame:
    """
    event_type: 'iap_purchase' or 'af_ad_revenue'
    from_date, to_date: 'YYYY-MM-DD'
    """
    params = {
        "from": from_date,
        "to": to_date,
        "media_source": media_source,
        "category": "standard",
        "currency": "USD",
        "geo": geo,
    }

    if event_type == "iap_purchase":
        params["event_name"] = "iap_purchase"
        path = f"/raw-data/export/app/{AF_APP_ID}/in_app_events_report/v5"
    elif event_type == "af_ad_revenue":
        path = f"/raw-data/export/app/{AF_APP_ID}/ad_revenue_raw/v5"
    else:
        raise ValueError(f"Unsupported event_type: {event_type}")

    url = AF_BASE_URL + path
    headers = {
        **COMMON_HEADERS,
        "accept": "text/csv",
    }

    resp = requests.get(url, headers=headers, params=params, timeout=120)
    resp.raise_for_status()

    csv_text = resp.text
    df = pd.read_csv(io.StringIO(csv_text))
    return df


def normalize_events_df(df: pd.DataFrame, event_type: str) -> pd.DataFrame:
    """
    从 AppsFlyer raw CSV 规范化成 af_events 所需字段。
    """
    if df.empty:
        return df

    # 解析时间
    df["Install Time Parsed"] = df["Install Time"].apply(parse_datetime_utc)
    df["Event Time Parsed"] = df["Event Time"].apply(parse_datetime_utc)

    df = df.dropna(subset=["Install Time Parsed", "Event Time Parsed"])

    df["install_date"] = df["Install Time Parsed"].dt.date
    df["event_date"] = df["Event Time Parsed"].dt.date

    df["days_since_install"] = df.apply(
        lambda r: compute_days_since_install(r["Install Time Parsed"], r["Event Time Parsed"]),
        axis=1,
    )

    df["event_name"] = event_type

    # 生成 event_id
    df["event_id"] = df.apply(generate_event_id, axis=1)

    # 选取需要的列 - using 'geo' for consistency across the system
    cols = {
        "event_id": "event_id",
        "App ID": "app_id",
        "App Name": "app_name",
        "Bundle ID": "bundle_id",
        "AppsFlyer ID": "appsflyer_id",
        "event_name": "event_name",
        "Event Time Parsed": "event_time",
        "event_date": "event_date",
        "Install Time Parsed": "install_time",
        "install_date": "install_date",
        "days_since_install": "days_since_install",
        "Event Revenue": "event_revenue",
        "Event Revenue USD": "event_revenue_usd",
        "Event Revenue Currency": "event_revenue_currency",
        "Country Code": "geo",  # Changed from country_code to geo for consistency
        "Media Source": "media_source",
        "Channel": "channel",
        "Campaign": "campaign",
        "Campaign ID": "campaign_id",
        "Adset": "adset",
        "Adset ID": "adset_id",
        "Ad": "ad",
        "Is Primary Attribution": "is_primary_attribution",
    }

    # 保证缺失列不会报错
    existing_cols = {k: v for k, v in cols.items() if k in df.columns}

    normalized = pd.DataFrame()
    for src, dst in existing_cols.items():
        normalized[dst] = df[src]

    # 补充必备列（空值）
    required = [
        "event_id",
        "app_id",
        "event_name",
        "event_time",
        "event_date",
        "install_time",
        "install_date",
        "days_since_install",
    ]
    for col in required:
        if col not in normalized.columns:
            normalized[col] = None

    # is_primary_attribution -> bool
    if "is_primary_attribution" in normalized.columns:
        normalized["is_primary_attribution"] = normalized["is_primary_attribution"].astype(str).str.lower().isin(
            ["true", "t", "1", "yes"]
        )

    return normalized


def upsert_events(df: pd.DataFrame):
    """
    将标准化后的 df 写入 af_events 表。
    使用 ON CONFLICT(event_id) DO NOTHING 保持幂等。
    """
    if df.empty:
        print("No events to upsert.")
        return

    cols = [
        "event_id",
        "app_id",
        "app_name",
        "bundle_id",
        "appsflyer_id",
        "event_name",
        "event_time",
        "event_date",
        "install_time",
        "install_date",
        "days_since_install",
        "event_revenue",
        "event_revenue_usd",
        "event_revenue_currency",
        "geo",  # Changed from country_code to geo for consistency
        "media_source",
        "channel",
        "campaign",
        "campaign_id",
        "adset",
        "adset_id",
        "ad",
        "is_primary_attribution",
    ]

    rows = []
    for _, r in df.iterrows():
        row = [r.get(c) for c in cols]
        rows.append(row)

    placeholders = "(" + ",".join(["%s"] * len(cols)) + ")"

    insert_sql = f"""
    INSERT INTO af_events (
      {", ".join(cols)}
    ) VALUES %s
    ON CONFLICT (event_id) DO NOTHING;
    """

    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(
                    cur,
                    insert_sql,
                    rows,
                    template=placeholders,
                )
        print(f"Upserted {len(rows)} rows into af_events.")
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# 2. Master Agg API：Cohort Cost + Retention
# -----------------------------------------------------------------------------

def fetch_master_agg_for_install_date(
    install_date: date,
    media_source: str,
    geo: str,
) -> List[Dict[str, Any]]:
    """
    调用 master-agg-data/v4，每次只拉某一天的 cohort：
    from=to=install_date

    假设返回 JSON 大致结构：
    {
      "data": [
        {
          "pid": "googleadwords_int",
          "c": "Some Campaign",
          "geo": "US",
          "cost": 12.34,
          "installs": 42,
          "retention_rate_day_1": 0.47,
          "retention_rate_day_3": 0.43,
          ...
        },
        ...
      ]
    }
    """
    from_str = install_date.strftime("%Y-%m-%d")
    to_str = from_str

    url = (
        f"{AF_BASE_URL}/master-agg-data/v4/app/{AF_APP_ID}"
        f"?from={from_str}&to={to_str}"
        f"&groupings=pid,c,geo"
        f"&kpis=cost,installs,retention_rate_day_1,retention_rate_day_3,retention_rate_day_5,retention_rate_day_7"
        f"&filters=pid={media_source};geo={geo}"
    )

    headers = {
        **COMMON_HEADERS,
        "accept": "application/json",
    }

    resp = requests.get(url, headers=headers, timeout=120)
    resp.raise_for_status()

    data = resp.json()
    rows = data.get("data", []) or data.get("rows", [])
    return rows


def build_cohort_kpi_rows(
    raw_rows: List[Dict[str, Any]],
    install_date: date,
) -> List[Dict[str, Any]]:
    """
    将 master-agg 的一批 rows 展开为多条 days_since_install 记录。

    对于每个 row（pid,c,geo 组合）：
    - days_since_install=0：记 installs + cost
    - days_since_install=1/3/5/7：记 retention_rate
    """
    out: List[Dict[str, Any]] = []

    for r in raw_rows:
        pid = r.get("pid") or r.get("media_source")
        campaign = r.get("c") or r.get("campaign")
        geo = r.get("geo") or r.get("country_code")

        installs = int(r.get("installs") or 0)
        cost = float(r.get("cost") or 0.0)

        # D0 行：cost + installs
        out.append(
            {
                "app_id": AF_APP_ID,
                "media_source": pid,
                "campaign": campaign,
                "geo": geo,
                "install_date": install_date,
                "days_since_install": 0,
                "installs": installs,
                "cost_usd": cost,
                "retention_rate": None,
            }
        )

        # D1/3/5/7 行：retention rate
        mapping = {
            1: r.get("retention_rate_day_1"),
            3: r.get("retention_rate_day_3"),
            5: r.get("retention_rate_day_5"),
            7: r.get("retention_rate_day_7"),
        }

        for d, val in mapping.items():
            if val is None:
                continue
            out.append(
                {
                    "app_id": AF_APP_ID,
                    "media_source": pid,
                    "campaign": campaign,
                    "geo": geo,
                    "install_date": install_date,
                    "days_since_install": d,
                    "installs": installs,
                    "cost_usd": None,
                    "retention_rate": float(val),
                }
            )

    return out


def upsert_cohort_kpi(rows: List[Dict[str, Any]]):
    """
    写入 af_cohort_kpi_daily。
    使用 ON CONFLICT (app_id, media_source, campaign, geo, install_date, days_since_install)
    DO UPDATE 保持幂等。
    """
    if not rows:
        print("No cohort KPI rows to upsert.")
        return

    cols = [
        "app_id",
        "media_source",
        "campaign",
        "geo",
        "install_date",
        "days_since_install",
        "installs",
        "cost_usd",
        "retention_rate",
    ]

    values = []
    for r in rows:
        values.append([r.get(c) for c in cols])

    placeholders = "(" + ",".join(["%s"] * len(cols)) + ")"

    insert_sql = f"""
    INSERT INTO af_cohort_kpi_daily (
      {", ".join(cols)}
    ) VALUES %s
    ON CONFLICT (app_id, media_source, campaign, geo, install_date, days_since_install)
    DO UPDATE SET
      installs = EXCLUDED.installs,
      cost_usd = COALESCE(EXCLUDED.cost_usd, af_cohort_kpi_daily.cost_usd),
      retention_rate = COALESCE(EXCLUDED.retention_rate, af_cohort_kpi_daily.retention_rate),
      last_refreshed_at = NOW();
    """

    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                psycopg2.extras.execute_values(
                    cur,
                    insert_sql,
                    values,
                    template=placeholders,
                )
        print(f"Upserted {len(values)} rows into af_cohort_kpi_daily.")
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# 3. 高层 orchestrator：拉指定日期窗口的数据
# -----------------------------------------------------------------------------

def daterange(start_date: date, end_date: date) -> Iterable[date]:
    """
    [start_date, end_date] 闭区间遍历。
    """
    cur = start_date
    while cur <= end_date:
        yield cur
        cur += timedelta(days=1)


def sync_events(
    from_date: str,
    to_date: str,
    media_source: str = AF_MEDIA_SOURCE_DEFAULT,
    geo: str = AF_GEO_DEFAULT,
):
    print(f"Fetching IAP events {from_date} ~ {to_date}")
    df_iap = fetch_raw_events_csv(
        event_type="iap_purchase",
        from_date=from_date,
        to_date=to_date,
        media_source=media_source,
        geo=geo,
    )
    norm_iap = normalize_events_df(df_iap, "iap_purchase")
    upsert_events(norm_iap)

    print(f"Fetching Ad Revenue events {from_date} ~ {to_date}")
    df_ad = fetch_raw_events_csv(
        event_type="af_ad_revenue",
        from_date=from_date,
        to_date=to_date,
        media_source=media_source,
        geo=geo,
    )
    norm_ad = normalize_events_df(df_ad, "af_ad_revenue")
    upsert_events(norm_ad)


def sync_cohort_kpi(
    start_install_date: str,
    end_install_date: str,
    media_source: str = AF_MEDIA_SOURCE_DEFAULT,
    geo: str = AF_GEO_DEFAULT,
):
    start = datetime.strptime(start_install_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_install_date, "%Y-%m-%d").date()

    for d in daterange(start, end):
        print(f"Fetching master-agg for install_date={d}")
        raw_rows = fetch_master_agg_for_install_date(d, media_source=media_source, geo=geo)
        rows = build_cohort_kpi_rows(raw_rows, d)
        upsert_cohort_kpi(rows)


def main():
    # 示例：拉 2025-11-01 ~ 2025-11-20 的事件数据
    sync_events("2025-11-01", "2025-11-20")

    # 示例：对 2025-11-01 ~ 2025-11-20 这些 install_date 的 cohort，拉 cost + retention
    sync_cohort_kpi("2025-11-01", "2025-11-20")


if __name__ == "__main__":
    main()
