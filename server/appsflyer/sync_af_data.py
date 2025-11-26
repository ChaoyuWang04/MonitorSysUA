# sync_af_data.py
"""
AppsFlyer Data Sync Script

Synchronizes IAP events, Ad Revenue events, and Cohort KPIs from AppsFlyer API
to PostgreSQL database for the MonitorSysUA evaluation system.

Usage:
    python sync_af_data.py --yesterday           # Sync yesterday's data
    python sync_af_data.py --from-date 2025-01-01 --to-date 2025-01-31
    python sync_af_data.py --events-only         # Only sync events
    python sync_af_data.py --kpi-only            # Only sync cohort KPIs
"""

import os
import io
import hashlib
import argparse
import time
import logging
from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional, Iterable

import requests
import pandas as pd
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# -----------------------------------------------------------------------------
# Logging Configuration
# -----------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

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
# Sync Log Functions (writes to af_sync_log table)
# -----------------------------------------------------------------------------

def create_sync_log(sync_type: str, date_start: date, date_end: date) -> int:
    """
    Create a sync log entry with status='running'.
    Returns the log_id for tracking.
    """
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO af_sync_log (sync_type, date_range_start, date_range_end, status, started_at)
                    VALUES (%s, %s, %s, 'running', NOW())
                    RETURNING id
                """, (sync_type, date_start, date_end))
                log_id = cur.fetchone()[0]
                logger.info(f"Created sync log #{log_id} for {sync_type}: {date_start} to {date_end}")
                return log_id
    finally:
        conn.close()


def update_sync_log(log_id: int, status: str, records_processed: int = None, error_message: str = None):
    """
    Update sync log entry with final status.
    """
    conn = get_pg_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE af_sync_log
                    SET status = %s, records_processed = %s, error_message = %s, completed_at = NOW()
                    WHERE id = %s
                """, (status, records_processed, error_message, log_id))
                logger.info(f"Updated sync log #{log_id}: status={status}, records={records_processed}")
    finally:
        conn.close()


# -----------------------------------------------------------------------------
# Retry Logic with Exponential Backoff
# -----------------------------------------------------------------------------

def fetch_with_retry(fetch_func, *args, max_retries: int = 3, **kwargs):
    """
    Wrapper for API calls with exponential backoff retry.
    Waits 5s, 10s, 20s between retries.
    """
    last_exception = None
    for attempt in range(max_retries):
        try:
            return fetch_func(*args, **kwargs)
        except requests.exceptions.RequestException as e:
            last_exception = e
            if attempt == max_retries - 1:
                logger.error(f"Request failed after {max_retries} attempts: {e}")
                raise
            wait_time = (2 ** attempt) * 5  # 5s, 10s, 20s
            logger.warning(f"Request failed (attempt {attempt + 1}/{max_retries}): {e}")
            logger.info(f"Retrying in {wait_time} seconds...")
            time.sleep(wait_time)
    raise last_exception


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
        logger.info("No events to upsert.")
        return 0

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
        logger.info(f"Upserted {len(rows)} rows into af_events.")
        return len(rows)
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

    API returns CSV format with columns:
    Media Source, Campaign, GEO, Cost, Installs, Retention Rate Day 1, etc.

    We filter client-side to only keep the specified media_source.
    """
    from_str = install_date.strftime("%Y-%m-%d")
    to_str = from_str

    # Note: API returns ALL media sources regardless of filter, so we filter client-side
    url = (
        f"{AF_BASE_URL}/master-agg-data/v4/app/{AF_APP_ID}"
        f"?from={from_str}&to={to_str}"
        f"&groupings=pid,c,geo"
        f"&kpis=cost,installs,retention_rate_day_1,retention_rate_day_3,retention_rate_day_5,retention_rate_day_7"
    )

    headers = {
        **COMMON_HEADERS,
        "accept": "text/csv",  # Request CSV format
    }

    resp = requests.get(url, headers=headers, timeout=120)
    resp.raise_for_status()

    # Handle empty response
    if not resp.text or resp.text.strip() == "":
        logger.debug(f"No cohort data for {install_date} (empty response)")
        return []

    # Parse CSV response
    try:
        df = pd.read_csv(io.StringIO(resp.text))
    except Exception as e:
        logger.warning(f"Failed to parse CSV for {install_date}: {e}")
        return []

    if df.empty:
        logger.debug(f"No cohort data for {install_date} (empty CSV)")
        return []

    # Normalize column names to match expected format
    column_mapping = {
        "Media Source": "pid",
        "Campaign": "c",
        "GEO": "geo",
        "Cost": "cost",
        "Installs": "installs",
        "Retention Rate Day 1": "retention_rate_day_1",
        "Retention Rate Day 3": "retention_rate_day_3",
        "Retention Rate Day 5": "retention_rate_day_5",
        "Retention Rate Day 7": "retention_rate_day_7",
    }
    df = df.rename(columns=column_mapping)

    # Filter to specified media_source only
    if media_source and "pid" in df.columns:
        df = df[df["pid"] == media_source]

    if df.empty:
        logger.debug(f"No cohort data for {install_date} with media_source={media_source}")
        return []

    # Aggregate duplicates (same pid, campaign, geo) by summing numeric columns
    # This handles cases where the API returns duplicate rows
    key_cols = ["pid", "c", "geo"]
    if len(df) != len(df.drop_duplicates(subset=key_cols)):
        logger.debug(f"Aggregating {len(df) - len(df.drop_duplicates(subset=key_cols))} duplicate rows")
        agg_dict = {
            "cost": "sum",
            "installs": "sum",
            "retention_rate_day_1": "mean",
            "retention_rate_day_3": "mean",
            "retention_rate_day_5": "mean",
            "retention_rate_day_7": "mean",
        }
        df = df.groupby(key_cols, as_index=False).agg(agg_dict)

    # Convert to list of dicts
    rows = df.to_dict(orient="records")
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


def upsert_cohort_kpi(rows: List[Dict[str, Any]]) -> int:
    """
    写入 af_cohort_kpi_daily。
    使用 ON CONFLICT (app_id, media_source, campaign, geo, install_date, days_since_install)
    DO UPDATE 保持幂等。
    Returns the number of rows upserted.
    """
    if not rows:
        logger.info("No cohort KPI rows to upsert.")
        return 0

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
        logger.info(f"Upserted {len(values)} rows into af_cohort_kpi_daily.")
        return len(values)
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
) -> int:
    """
    Sync IAP and Ad Revenue events for a date range.
    Returns total number of records processed.
    """
    total_records = 0

    logger.info(f"Fetching IAP events {from_date} ~ {to_date}")
    df_iap = fetch_with_retry(
        fetch_raw_events_csv,
        event_type="iap_purchase",
        from_date=from_date,
        to_date=to_date,
        media_source=media_source,
        geo=geo,
    )
    norm_iap = normalize_events_df(df_iap, "iap_purchase")
    total_records += upsert_events(norm_iap) or 0

    logger.info(f"Fetching Ad Revenue events {from_date} ~ {to_date}")
    df_ad = fetch_with_retry(
        fetch_raw_events_csv,
        event_type="af_ad_revenue",
        from_date=from_date,
        to_date=to_date,
        media_source=media_source,
        geo=geo,
    )
    norm_ad = normalize_events_df(df_ad, "af_ad_revenue")
    total_records += upsert_events(norm_ad) or 0

    return total_records


def sync_cohort_kpi(
    start_install_date: str,
    end_install_date: str,
    media_source: str = AF_MEDIA_SOURCE_DEFAULT,
    geo: str = AF_GEO_DEFAULT,
) -> int:
    """
    Sync cohort KPI data (cost, installs, retention) for a date range.
    Returns total number of records processed.
    """
    start = datetime.strptime(start_install_date, "%Y-%m-%d").date()
    end = datetime.strptime(end_install_date, "%Y-%m-%d").date()

    total_records = 0
    for d in daterange(start, end):
        logger.info(f"Fetching master-agg for install_date={d}")
        raw_rows = fetch_with_retry(fetch_master_agg_for_install_date, d, media_source=media_source, geo=geo)
        rows = build_cohort_kpi_rows(raw_rows, d)
        total_records += upsert_cohort_kpi(rows) or 0

    return total_records


# -----------------------------------------------------------------------------
# High-Level Sync Functions with Logging
# -----------------------------------------------------------------------------

def sync_events_with_logging(from_date: str, to_date: str) -> int:
    """
    Sync events with sync log tracking.
    """
    start_dt = datetime.strptime(from_date, "%Y-%m-%d").date()
    end_dt = datetime.strptime(to_date, "%Y-%m-%d").date()

    log_id = create_sync_log("events", start_dt, end_dt)
    try:
        records = sync_events(from_date, to_date)
        update_sync_log(log_id, "success", records)
        return records
    except Exception as e:
        update_sync_log(log_id, "failed", error_message=str(e))
        raise


def sync_cohort_kpi_with_logging(from_date: str, to_date: str) -> int:
    """
    Sync cohort KPI with sync log tracking.
    """
    start_dt = datetime.strptime(from_date, "%Y-%m-%d").date()
    end_dt = datetime.strptime(to_date, "%Y-%m-%d").date()

    log_id = create_sync_log("cohort_kpi", start_dt, end_dt)
    try:
        records = sync_cohort_kpi(from_date, to_date)
        update_sync_log(log_id, "success", records)
        return records
    except Exception as e:
        update_sync_log(log_id, "failed", error_message=str(e))
        raise


def main():
    """
    Main entry point with CLI argument parsing.
    """
    parser = argparse.ArgumentParser(
        description='AppsFlyer Data Sync - Synchronize events and cohort KPIs to PostgreSQL',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python sync_af_data.py --yesterday                     # Sync yesterday's data
  python sync_af_data.py --from-date 2025-01-01 --to-date 2025-01-31
  python sync_af_data.py --from-date 2025-01-01 --to-date 2025-01-07 --events-only
  python sync_af_data.py --from-date 2025-01-01 --to-date 2025-01-07 --kpi-only
        """
    )
    parser.add_argument('--yesterday', action='store_true',
                        help='Sync yesterday\'s data only')
    parser.add_argument('--from-date', dest='from_date',
                        help='Start date (YYYY-MM-DD)')
    parser.add_argument('--to-date', dest='to_date',
                        help='End date (YYYY-MM-DD)')
    parser.add_argument('--events-only', action='store_true',
                        help='Only sync events (skip cohort KPI)')
    parser.add_argument('--kpi-only', action='store_true',
                        help='Only sync cohort KPI (skip events)')

    args = parser.parse_args()

    # Determine date range
    if args.yesterday:
        yesterday = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
        from_date = to_date = yesterday
        logger.info(f"Mode: Yesterday ({yesterday})")
    elif args.from_date and args.to_date:
        from_date = args.from_date
        to_date = args.to_date
        logger.info(f"Mode: Custom range ({from_date} to {to_date})")
    else:
        # Default: last 7 days
        to_date = (date.today() - timedelta(days=1)).strftime('%Y-%m-%d')
        from_date = (date.today() - timedelta(days=7)).strftime('%Y-%m-%d')
        logger.info(f"Mode: Default (last 7 days: {from_date} to {to_date})")

    logger.info("=" * 60)
    logger.info(f"AppsFlyer Data Sync Starting")
    logger.info(f"Date range: {from_date} to {to_date}")
    logger.info(f"Events: {'Yes' if not args.kpi_only else 'Skip'}")
    logger.info(f"Cohort KPI: {'Yes' if not args.events_only else 'Skip'}")
    logger.info("=" * 60)

    total_events = 0
    total_kpi = 0

    try:
        if not args.kpi_only:
            logger.info("Starting events sync...")
            total_events = sync_events_with_logging(from_date, to_date)
            logger.info(f"Events sync complete: {total_events} records")

        if not args.events_only:
            logger.info("Starting cohort KPI sync...")
            total_kpi = sync_cohort_kpi_with_logging(from_date, to_date)
            logger.info(f"Cohort KPI sync complete: {total_kpi} records")

        logger.info("=" * 60)
        logger.info(f"Sync completed successfully!")
        logger.info(f"Total events: {total_events}")
        logger.info(f"Total KPI records: {total_kpi}")
        logger.info("=" * 60)

    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise


if __name__ == "__main__":
    main()
