-- Create "campaign_evaluation" table
CREATE TABLE "campaign_evaluation" (
  "id" serial NOT NULL,
  "campaign_id" character varying(100) NOT NULL,
  "campaign_name" character varying(200) NULL,
  "evaluation_date" date NOT NULL,
  "campaign_type" character varying(20) NULL,
  "total_spend" numeric(15,2) NULL,
  "actual_roas7" numeric(10,4) NULL,
  "actual_ret7" numeric(10,4) NULL,
  "baseline_roas7" numeric(10,4) NULL,
  "baseline_ret7" numeric(10,4) NULL,
  "roas_achievement_rate" numeric(10,2) NULL,
  "ret_achievement_rate" numeric(10,2) NULL,
  "min_achievement_rate" numeric(10,2) NULL,
  "recommendation_type" character varying(50) NULL,
  "status" character varying(20) NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "campaign_date_idx" to table: "campaign_evaluation"
CREATE INDEX "campaign_date_idx" ON "campaign_evaluation" ("campaign_id", "evaluation_date");
-- Create index "recommendation_type_idx" to table: "campaign_evaluation"
CREATE INDEX "recommendation_type_idx" ON "campaign_evaluation" ("recommendation_type");
-- Create index "status_idx" to table: "campaign_evaluation"
CREATE INDEX "status_idx" ON "campaign_evaluation" ("status");
-- Create "creative_evaluation" table
CREATE TABLE "creative_evaluation" (
  "id" serial NOT NULL,
  "campaign_id" character varying(100) NOT NULL,
  "creative_id" character varying(100) NULL,
  "creative_name" character varying(200) NULL,
  "evaluation_day" character varying(10) NULL,
  "evaluation_date" date NOT NULL,
  "impressions" integer NULL,
  "installs" integer NULL,
  "cvr" numeric(10,6) NULL,
  "actual_cpi" numeric(10,2) NULL,
  "actual_roas" numeric(10,4) NULL,
  "max_cpi_threshold" numeric(10,2) NULL,
  "min_roas_threshold" numeric(10,4) NULL,
  "creative_status" character varying(30) NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "creative_idx" to table: "creative_evaluation"
CREATE INDEX "creative_idx" ON "creative_evaluation" ("campaign_id", "creative_id", "evaluation_day");
-- Create index "creative_status_idx" to table: "creative_evaluation"
CREATE INDEX "creative_status_idx" ON "creative_evaluation" ("creative_status");
-- Create "creative_test_baseline" table
CREATE TABLE "creative_test_baseline" (
  "id" serial NOT NULL,
  "product_name" character varying(100) NOT NULL,
  "country_code" character varying(10) NOT NULL,
  "platform" character varying(20) NOT NULL DEFAULT 'Android',
  "channel" character varying(20) NOT NULL DEFAULT 'Google',
  "max_cpi" numeric(10,2) NULL,
  "min_roas_d3" numeric(10,4) NULL,
  "min_roas_d7" numeric(10,4) NULL,
  "excellent_cvr" numeric(10,6) NULL,
  "last_updated" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "unique_creative_baseline" to table: "creative_test_baseline"
CREATE UNIQUE INDEX "unique_creative_baseline" ON "creative_test_baseline" ("product_name", "country_code", "platform", "channel");
-- Create "mock_campaign_performance" table
CREATE TABLE "mock_campaign_performance" (
  "id" serial NOT NULL,
  "campaign_id" character varying(100) NOT NULL,
  "campaign_name" character varying(200) NOT NULL,
  "product_name" character varying(100) NOT NULL,
  "country_code" character varying(10) NOT NULL,
  "platform" character varying(20) NOT NULL DEFAULT 'Android',
  "channel" character varying(20) NOT NULL DEFAULT 'Google',
  "date" date NOT NULL,
  "total_spend" numeric(15,2) NOT NULL,
  "total_revenue" numeric(15,2) NOT NULL,
  "total_installs" integer NOT NULL,
  "d7_active_users" integer NOT NULL,
  "actual_roas7" numeric(10,4) NOT NULL,
  "actual_ret7" numeric(10,4) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "mock_campaign_date_idx" to table: "mock_campaign_performance"
CREATE INDEX "mock_campaign_date_idx" ON "mock_campaign_performance" ("date");
-- Create index "mock_campaign_product_country_idx" to table: "mock_campaign_performance"
CREATE INDEX "mock_campaign_product_country_idx" ON "mock_campaign_performance" ("product_name", "country_code", "platform", "channel");
-- Create index "unique_campaign_date" to table: "mock_campaign_performance"
CREATE UNIQUE INDEX "unique_campaign_date" ON "mock_campaign_performance" ("campaign_id", "date");
-- Create "mock_creative_performance" table
CREATE TABLE "mock_creative_performance" (
  "id" serial NOT NULL,
  "creative_id" character varying(100) NOT NULL,
  "creative_name" character varying(200) NOT NULL,
  "campaign_id" character varying(100) NOT NULL,
  "product_name" character varying(100) NOT NULL,
  "country_code" character varying(10) NOT NULL,
  "platform" character varying(20) NOT NULL DEFAULT 'Android',
  "channel" character varying(20) NOT NULL DEFAULT 'Google',
  "impressions" integer NOT NULL,
  "installs" integer NOT NULL,
  "cvr" numeric(10,6) NOT NULL,
  "cpi" numeric(10,2) NOT NULL,
  "roas_d3" numeric(10,4) NOT NULL,
  "roas_d7" numeric(10,4) NOT NULL,
  "spend" numeric(15,2) NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "mock_creative_campaign_idx" to table: "mock_creative_performance"
CREATE INDEX "mock_creative_campaign_idx" ON "mock_creative_performance" ("campaign_id");
-- Create index "mock_creative_product_country_idx" to table: "mock_creative_performance"
CREATE INDEX "mock_creative_product_country_idx" ON "mock_creative_performance" ("product_name", "country_code", "platform", "channel");
-- Create index "unique_creative_campaign" to table: "mock_creative_performance"
CREATE UNIQUE INDEX "unique_creative_campaign" ON "mock_creative_performance" ("creative_id", "campaign_id");
-- Create "optimizer_leaderboard" table
CREATE TABLE "optimizer_leaderboard" (
  "id" serial NOT NULL,
  "optimizer_email" character varying(100) NOT NULL,
  "total_operations" integer NOT NULL DEFAULT 0,
  "excellent_count" integer NOT NULL DEFAULT 0,
  "qualified_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "success_rate" numeric(10,2) NOT NULL DEFAULT 0,
  "last_updated" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "optimizer_leaderboard_optimizer_email_unique" UNIQUE ("optimizer_email")
);
-- Create index "success_rate_idx" to table: "optimizer_leaderboard"
CREATE INDEX "success_rate_idx" ON "optimizer_leaderboard" ("success_rate");
-- Create "safety_baseline" table
CREATE TABLE "safety_baseline" (
  "id" serial NOT NULL,
  "product_name" character varying(100) NOT NULL,
  "country_code" character varying(10) NOT NULL,
  "platform" character varying(20) NOT NULL DEFAULT 'Android',
  "channel" character varying(20) NOT NULL DEFAULT 'Google',
  "baseline_roas7" numeric(10,4) NULL,
  "baseline_ret7" numeric(10,4) NULL,
  "reference_period" character varying(20) NULL,
  "last_updated" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "unique_baseline" to table: "safety_baseline"
CREATE UNIQUE INDEX "unique_baseline" ON "safety_baseline" ("product_name", "country_code", "platform", "channel");
-- Create "action_recommendation" table
CREATE TABLE "action_recommendation" (
  "id" serial NOT NULL,
  "campaign_id" character varying(100) NOT NULL,
  "evaluation_id" integer NULL,
  "recommendation_date" date NOT NULL,
  "recommendation_type" character varying(50) NULL,
  "action_options" jsonb NULL,
  "selected_action" jsonb NULL,
  "executed" boolean NOT NULL DEFAULT false,
  "executed_at" timestamp NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "action_recommendation_evaluation_id_campaign_evaluation_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "campaign_evaluation" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "executed_idx" to table: "action_recommendation"
CREATE INDEX "executed_idx" ON "action_recommendation" ("executed");
-- Create index "recommendation_idx" to table: "action_recommendation"
CREATE INDEX "recommendation_idx" ON "action_recommendation" ("campaign_id", "recommendation_date");
-- Create "accounts" table
CREATE TABLE "accounts" (
  "id" serial NOT NULL,
  "customer_id" text NOT NULL,
  "name" text NOT NULL,
  "currency" text NULL,
  "time_zone" text NULL,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_synced_at" timestamp NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "accounts_customer_id_unique" UNIQUE ("customer_id")
);
-- Create index "customer_id_idx" to table: "accounts"
CREATE INDEX "customer_id_idx" ON "accounts" ("customer_id");
-- Create "change_events" table
CREATE TABLE "change_events" (
  "id" serial NOT NULL,
  "account_id" integer NOT NULL,
  "timestamp" timestamptz NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "user_email" text NOT NULL,
  "resource_type" text NOT NULL,
  "operation_type" text NOT NULL,
  "resource_name" text NOT NULL,
  "client_type" text NULL,
  "campaign" text NULL,
  "ad_group" text NULL,
  "summary" text NOT NULL,
  "summary_zh" text NULL,
  "field_changes" jsonb NULL,
  "changed_fields_paths" jsonb NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "change_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);
-- Create index "account_id_idx" to table: "change_events"
CREATE INDEX "account_id_idx" ON "change_events" ("account_id");
-- Create index "account_timestamp_idx" to table: "change_events"
CREATE INDEX "account_timestamp_idx" ON "change_events" ("account_id", "timestamp");
-- Create index "campaign_idx" to table: "change_events"
CREATE INDEX "campaign_idx" ON "change_events" ("campaign");
-- Create index "operation_type_idx" to table: "change_events"
CREATE INDEX "operation_type_idx" ON "change_events" ("operation_type");
-- Create index "resource_type_idx" to table: "change_events"
CREATE INDEX "resource_type_idx" ON "change_events" ("resource_type");
-- Create index "timestamp_idx" to table: "change_events"
CREATE INDEX "timestamp_idx" ON "change_events" ("timestamp");
-- Create index "unique_event" to table: "change_events"
CREATE UNIQUE INDEX "unique_event" ON "change_events" ("account_id", "timestamp", "resource_name", "user_email");
-- Create index "user_email_idx" to table: "change_events"
CREATE INDEX "user_email_idx" ON "change_events" ("user_email");
-- Create "operation_score" table
CREATE TABLE "operation_score" (
  "id" serial NOT NULL,
  "operation_id" integer NULL,
  "campaign_id" character varying(100) NOT NULL,
  "optimizer_email" character varying(100) NULL,
  "operation_type" character varying(50) NULL,
  "operation_date" date NOT NULL,
  "evaluation_date" date NOT NULL,
  "actual_roas7" numeric(10,4) NULL,
  "actual_ret7" numeric(10,4) NULL,
  "baseline_roas7" numeric(10,4) NULL,
  "baseline_ret7" numeric(10,4) NULL,
  "roas_achievement_rate" numeric(10,2) NULL,
  "ret_achievement_rate" numeric(10,2) NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("id"),
  CONSTRAINT "operation_score_operation_id_change_events_id_fk" FOREIGN KEY ("operation_id") REFERENCES "change_events" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);
-- Create index "operation_idx" to table: "operation_score"
CREATE INDEX "operation_idx" ON "operation_score" ("operation_id", "evaluation_date");
-- Create index "optimizer_email_idx" to table: "operation_score"
CREATE INDEX "optimizer_email_idx" ON "operation_score" ("optimizer_email");
