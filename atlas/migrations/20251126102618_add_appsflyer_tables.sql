-- Create "af_cohort_kpi_daily" table
CREATE TABLE "af_cohort_kpi_daily" (
  "id" serial NOT NULL,
  "app_id" text NOT NULL,
  "media_source" text NOT NULL,
  "campaign" text NOT NULL,
  "geo" text NOT NULL,
  "install_date" date NOT NULL,
  "days_since_install" integer NOT NULL,
  "installs" integer NULL,
  "cost_usd" numeric(18,6) NULL,
  "retention_rate" numeric(8,4) NULL,
  "last_refreshed_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "idx_af_cohort_kpi_cohort" to table: "af_cohort_kpi_daily"
CREATE INDEX "idx_af_cohort_kpi_cohort" ON "af_cohort_kpi_daily" ("app_id", "geo", "media_source", "campaign", "install_date");
-- Create index "idx_af_cohort_kpi_install_date" to table: "af_cohort_kpi_daily"
CREATE INDEX "idx_af_cohort_kpi_install_date" ON "af_cohort_kpi_daily" ("install_date");
-- Create index "unique_af_cohort_kpi" to table: "af_cohort_kpi_daily"
CREATE UNIQUE INDEX "unique_af_cohort_kpi" ON "af_cohort_kpi_daily" ("app_id", "media_source", "campaign", "geo", "install_date", "days_since_install");
-- Create "af_events" table
CREATE TABLE "af_events" (
  "event_id" text NOT NULL,
  "imported_at" timestamptz NOT NULL DEFAULT now(),
  "app_id" text NOT NULL,
  "app_name" text NULL,
  "bundle_id" text NULL,
  "appsflyer_id" text NULL,
  "event_name" text NOT NULL,
  "event_time" timestamptz NOT NULL,
  "event_date" date NOT NULL,
  "install_time" timestamptz NOT NULL,
  "install_date" date NOT NULL,
  "days_since_install" integer NOT NULL,
  "event_revenue" numeric(18,6) NULL,
  "event_revenue_usd" numeric(18,6) NULL,
  "event_revenue_currency" text NULL,
  "geo" text NULL,
  "media_source" text NULL,
  "channel" text NULL,
  "campaign" text NULL,
  "campaign_id" text NULL,
  "adset" text NULL,
  "adset_id" text NULL,
  "ad" text NULL,
  "is_primary_attribution" boolean NULL,
  "raw_payload" jsonb NULL,
  PRIMARY KEY ("event_id")
);
-- Create index "idx_af_events_cohort" to table: "af_events"
CREATE INDEX "idx_af_events_cohort" ON "af_events" ("app_id", "geo", "media_source", "campaign", "adset", "install_date");
-- Create index "idx_af_events_event_date" to table: "af_events"
CREATE INDEX "idx_af_events_event_date" ON "af_events" ("event_date");
-- Create index "idx_af_events_event_name" to table: "af_events"
CREATE INDEX "idx_af_events_event_name" ON "af_events" ("event_name");
-- Create index "idx_af_events_install_date" to table: "af_events"
CREATE INDEX "idx_af_events_install_date" ON "af_events" ("install_date");
-- Create "af_sync_log" table
CREATE TABLE "af_sync_log" (
  "id" serial NOT NULL,
  "sync_type" character varying(20) NOT NULL,
  "date_range_start" date NULL,
  "date_range_end" date NULL,
  "status" character varying(20) NOT NULL DEFAULT 'running',
  "records_processed" integer NULL,
  "error_message" text NULL,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz NULL,
  PRIMARY KEY ("id")
);
-- Create index "idx_af_sync_log_started_at" to table: "af_sync_log"
CREATE INDEX "idx_af_sync_log_started_at" ON "af_sync_log" ("started_at");
-- Create index "idx_af_sync_log_status" to table: "af_sync_log"
CREATE INDEX "idx_af_sync_log_status" ON "af_sync_log" ("status");
-- Create index "idx_af_sync_log_sync_type" to table: "af_sync_log"
CREATE INDEX "idx_af_sync_log_sync_type" ON "af_sync_log" ("sync_type");
