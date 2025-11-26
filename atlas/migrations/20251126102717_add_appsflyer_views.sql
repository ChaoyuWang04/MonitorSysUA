-- af_revenue_cohort_daily: Aggregates revenue from af_events by cohort dimensions
CREATE OR REPLACE VIEW af_revenue_cohort_daily AS
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
  SUM(COALESCE(event_revenue_usd, 0)) AS total_revenue_usd
FROM af_events
GROUP BY app_id, geo, media_source, campaign, adset, install_date, days_since_install;

-- af_cohort_metrics_daily: Joins revenue view with KPI data for complete cohort metrics
CREATE OR REPLACE VIEW af_cohort_metrics_daily AS
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
