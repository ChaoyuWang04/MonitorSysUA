CREATE TABLE "action_recommendation" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" varchar(100) NOT NULL,
	"evaluation_id" integer,
	"recommendation_date" date NOT NULL,
	"recommendation_type" varchar(50),
	"action_options" jsonb,
	"selected_action" jsonb,
	"executed" boolean DEFAULT false NOT NULL,
	"executed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_evaluation" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" varchar(100) NOT NULL,
	"campaign_name" varchar(200),
	"evaluation_date" date NOT NULL,
	"campaign_type" varchar(20),
	"total_spend" numeric(15, 2),
	"actual_roas7" numeric(10, 4),
	"actual_ret7" numeric(10, 4),
	"baseline_roas7" numeric(10, 4),
	"baseline_ret7" numeric(10, 4),
	"roas_achievement_rate" numeric(10, 2),
	"ret_achievement_rate" numeric(10, 2),
	"min_achievement_rate" numeric(10, 2),
	"recommendation_type" varchar(50),
	"status" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_evaluation" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" varchar(100) NOT NULL,
	"creative_id" varchar(100),
	"creative_name" varchar(200),
	"evaluation_day" varchar(10),
	"evaluation_date" date NOT NULL,
	"impressions" integer,
	"installs" integer,
	"cvr" numeric(10, 6),
	"actual_cpi" numeric(10, 2),
	"actual_roas" numeric(10, 4),
	"max_cpi_threshold" numeric(10, 2),
	"min_roas_threshold" numeric(10, 4),
	"creative_status" varchar(30),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creative_test_baseline" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"platform" varchar(20) DEFAULT 'Android' NOT NULL,
	"channel" varchar(20) DEFAULT 'Google' NOT NULL,
	"max_cpi" numeric(10, 2),
	"min_roas_d3" numeric(10, 4),
	"min_roas_d7" numeric(10, 4),
	"excellent_cvr" numeric(10, 6),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operation_score" (
	"id" serial PRIMARY KEY NOT NULL,
	"operation_id" integer,
	"campaign_id" varchar(100) NOT NULL,
	"optimizer_email" varchar(100),
	"operation_type" varchar(50),
	"operation_date" date NOT NULL,
	"evaluation_date" date NOT NULL,
	"actual_roas7" numeric(10, 4),
	"actual_ret7" numeric(10, 4),
	"baseline_roas7" numeric(10, 4),
	"baseline_ret7" numeric(10, 4),
	"roas_achievement_rate" numeric(10, 2),
	"ret_achievement_rate" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_baseline" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"platform" varchar(20) DEFAULT 'Android' NOT NULL,
	"channel" varchar(20) DEFAULT 'Google' NOT NULL,
	"baseline_roas7" numeric(10, 4),
	"baseline_ret7" numeric(10, 4),
	"reference_period" varchar(20),
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "action_recommendation" ADD CONSTRAINT "action_recommendation_evaluation_id_campaign_evaluation_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."campaign_evaluation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operation_score" ADD CONSTRAINT "operation_score_operation_id_change_events_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."change_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "recommendation_idx" ON "action_recommendation" USING btree ("campaign_id","recommendation_date");--> statement-breakpoint
CREATE INDEX "executed_idx" ON "action_recommendation" USING btree ("executed");--> statement-breakpoint
CREATE INDEX "campaign_date_idx" ON "campaign_evaluation" USING btree ("campaign_id","evaluation_date");--> statement-breakpoint
CREATE INDEX "status_idx" ON "campaign_evaluation" USING btree ("status");--> statement-breakpoint
CREATE INDEX "recommendation_type_idx" ON "campaign_evaluation" USING btree ("recommendation_type");--> statement-breakpoint
CREATE INDEX "creative_idx" ON "creative_evaluation" USING btree ("campaign_id","creative_id","evaluation_day");--> statement-breakpoint
CREATE INDEX "creative_status_idx" ON "creative_evaluation" USING btree ("creative_status");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_creative_baseline" ON "creative_test_baseline" USING btree ("product_name","country_code","platform","channel");--> statement-breakpoint
CREATE INDEX "operation_idx" ON "operation_score" USING btree ("operation_id","evaluation_date");--> statement-breakpoint
CREATE INDEX "optimizer_email_idx" ON "operation_score" USING btree ("optimizer_email");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_baseline" ON "safety_baseline" USING btree ("product_name","country_code","platform","channel");
