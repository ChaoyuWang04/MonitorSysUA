-- Create "baseline_metrics" table
CREATE TABLE "baseline_metrics" (
  "id" serial NOT NULL,
  "app_id" character varying(255) NOT NULL,
  "media_source" character varying(100) NOT NULL DEFAULT 'ALL',
  "geo" character varying(10) NOT NULL DEFAULT 'ALL',
  "platform" character varying(20) NULL DEFAULT 'ALL',
  "baseline_roas_d3" numeric(6,4) NULL,
  "baseline_roas_d7" numeric(6,4) NULL,
  "baseline_ret_d3" numeric(5,4) NULL,
  "baseline_ret_d7" numeric(5,4) NULL,
  "baseline_cpi" numeric(10,4) NULL,
  "baseline_cvr" numeric(6,4) NULL,
  "sample_start_date" date NULL,
  "sample_end_date" date NULL,
  "sample_size" integer NULL,
  "next_update_date" date NULL,
  "is_active" boolean NULL DEFAULT true,
  "manual_override" boolean NULL DEFAULT false,
  "created_at" timestamp NULL DEFAULT now(),
  "updated_at" timestamp NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "baseline_metrics_unique" to table: "baseline_metrics"
CREATE UNIQUE INDEX "baseline_metrics_unique" ON "baseline_metrics" ("app_id", "media_source", "geo", "platform");
