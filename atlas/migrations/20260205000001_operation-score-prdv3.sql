-- Modify "change_events" table
ALTER TABLE "change_events" ADD COLUMN "operation_scores" jsonb NULL;
-- Modify "operation_score" table
ALTER TABLE "operation_score" ADD COLUMN "score_stage" character varying(10) NOT NULL DEFAULT 'T+7', ADD COLUMN "stage_factor" numeric(4,2) NULL, ADD COLUMN "actual_roas" numeric(12,6) NULL, ADD COLUMN "actual_ret" numeric(12,6) NULL, ADD COLUMN "baseline_roas" numeric(12,6) NULL, ADD COLUMN "baseline_ret" numeric(12,6) NULL, ADD COLUMN "roas_achievement" numeric(12,6) NULL, ADD COLUMN "retention_achievement" numeric(12,6) NULL, ADD COLUMN "min_achievement" numeric(12,6) NULL, ADD COLUMN "risk_level" character varying(20) NULL, ADD COLUMN "base_score" integer NULL, ADD COLUMN "final_score" numeric(5,2) NULL, ADD COLUMN "value_before" numeric(12,4) NULL, ADD COLUMN "value_after" numeric(12,4) NULL, ADD COLUMN "change_percentage" numeric(6,4) NULL, ADD COLUMN "operation_magnitude" numeric(6,4) NULL, ADD COLUMN "operation_type_label" character varying(20) NULL, ADD COLUMN "is_bold_success" boolean NULL DEFAULT false, ADD COLUMN "special_recognition" character varying(100) NULL, ADD COLUMN "suggestion_type" character varying(50) NULL, ADD COLUMN "suggestion_detail" text NULL;
-- Create index "operation_stage_uidx" to table: "operation_score"
CREATE UNIQUE INDEX "operation_stage_uidx" ON "operation_score" ("operation_id", "score_stage");
-- Modify "ad_groups" table
ALTER TABLE "ad_groups" DROP CONSTRAINT "ad_groups_account_id_fkey", ADD CONSTRAINT "ad_groups_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "ads" table
ALTER TABLE "ads" DROP CONSTRAINT "ads_account_id_fkey", ADD CONSTRAINT "ads_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
-- Modify "campaigns" table
ALTER TABLE "campaigns" DROP CONSTRAINT "campaigns_account_id_fkey", ADD CONSTRAINT "campaigns_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON UPDATE NO ACTION ON DELETE CASCADE;
