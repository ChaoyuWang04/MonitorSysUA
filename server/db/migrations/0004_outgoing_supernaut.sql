CREATE TABLE "mock_campaign_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" varchar(100) NOT NULL,
	"campaign_name" varchar(200) NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"platform" varchar(20) DEFAULT 'Android' NOT NULL,
	"channel" varchar(20) DEFAULT 'Google' NOT NULL,
	"date" date NOT NULL,
	"total_spend" numeric(15, 2) NOT NULL,
	"total_revenue" numeric(15, 2) NOT NULL,
	"total_installs" integer NOT NULL,
	"d7_active_users" integer NOT NULL,
	"actual_roas7" numeric(10, 4) NOT NULL,
	"actual_ret7" numeric(10, 4) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mock_creative_performance" (
	"id" serial PRIMARY KEY NOT NULL,
	"creative_id" varchar(100) NOT NULL,
	"creative_name" varchar(200) NOT NULL,
	"campaign_id" varchar(100) NOT NULL,
	"product_name" varchar(100) NOT NULL,
	"country_code" varchar(10) NOT NULL,
	"platform" varchar(20) DEFAULT 'Android' NOT NULL,
	"channel" varchar(20) DEFAULT 'Google' NOT NULL,
	"impressions" integer NOT NULL,
	"installs" integer NOT NULL,
	"cvr" numeric(10, 6) NOT NULL,
	"cpi" numeric(10, 2) NOT NULL,
	"roas_d3" numeric(10, 4) NOT NULL,
	"roas_d7" numeric(10, 4) NOT NULL,
	"spend" numeric(15, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "unique_campaign_date" ON "mock_campaign_performance" USING btree ("campaign_id","date");--> statement-breakpoint
CREATE INDEX "mock_campaign_date_idx" ON "mock_campaign_performance" USING btree ("date");--> statement-breakpoint
CREATE INDEX "mock_campaign_product_country_idx" ON "mock_campaign_performance" USING btree ("product_name","country_code","platform","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_creative_campaign" ON "mock_creative_performance" USING btree ("creative_id","campaign_id");--> statement-breakpoint
CREATE INDEX "mock_creative_campaign_idx" ON "mock_creative_performance" USING btree ("campaign_id");--> statement-breakpoint
CREATE INDEX "mock_creative_product_country_idx" ON "mock_creative_performance" USING btree ("product_name","country_code","platform","channel");
