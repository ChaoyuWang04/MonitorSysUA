-- Add campaigns table
CREATE TABLE "campaigns" (
  "id" serial PRIMARY KEY,
  "account_id" integer NOT NULL REFERENCES "accounts" ("id") ON DELETE cascade ON UPDATE no action,
  "resource_name" text NOT NULL,
  "campaign_id" text NOT NULL,
  "name" text,
  "status" text,
  "serving_status" text,
  "primary_status" text,
  "channel_type" text,
  "channel_sub_type" text,
  "bidding_strategy_type" text,
  "start_date" date,
  "end_date" date,
  "budget_id" text,
  "budget_amount_micros" bigint,
  "currency" text,
  "last_modified_time" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "campaign_resource_account_uidx" ON "campaigns" ("account_id", "resource_name");
CREATE INDEX "campaign_account_idx" ON "campaigns" ("account_id");
CREATE INDEX "campaign_campaign_id_idx" ON "campaigns" ("campaign_id");
CREATE INDEX "campaign_status_idx" ON "campaigns" ("status");
CREATE INDEX "campaign_channel_idx" ON "campaigns" ("channel_type");

-- Add ad_groups table
CREATE TABLE "ad_groups" (
  "id" serial PRIMARY KEY,
  "account_id" integer NOT NULL REFERENCES "accounts" ("id") ON DELETE cascade ON UPDATE no action,
  "resource_name" text NOT NULL,
  "ad_group_id" text NOT NULL,
  "campaign_id" text NOT NULL,
  "name" text,
  "status" text,
  "type" text,
  "cpc_bid_micros" bigint,
  "cpm_bid_micros" bigint,
  "target_cpa_micros" bigint,
  "last_modified_time" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "ad_group_resource_account_uidx" ON "ad_groups" ("account_id", "resource_name");
CREATE INDEX "ad_group_account_idx" ON "ad_groups" ("account_id");
CREATE INDEX "ad_group_id_idx" ON "ad_groups" ("ad_group_id");
CREATE INDEX "ad_group_campaign_id_idx" ON "ad_groups" ("campaign_id");
CREATE INDEX "ad_group_status_idx" ON "ad_groups" ("status");
CREATE INDEX "ad_group_type_idx" ON "ad_groups" ("type");

-- Add ads table
CREATE TABLE "ads" (
  "id" serial PRIMARY KEY,
  "account_id" integer NOT NULL REFERENCES "accounts" ("id") ON DELETE cascade ON UPDATE no action,
  "resource_name" text NOT NULL,
  "ad_id" text NOT NULL,
  "ad_group_id" text NOT NULL,
  "campaign_id" text NOT NULL,
  "name" text,
  "type" text,
  "status" text,
  "added_by_google_ads" boolean,
  "final_urls" jsonb,
  "final_mobile_urls" jsonb,
  "display_url" text,
  "device_preference" text,
  "system_managed_resource_source" text,
  "last_modified_time" timestamptz,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "ads_resource_account_uidx" ON "ads" ("account_id", "resource_name");
CREATE INDEX "ads_account_idx" ON "ads" ("account_id");
CREATE INDEX "ads_ad_id_idx" ON "ads" ("ad_id");
CREATE INDEX "ads_ad_group_id_idx" ON "ads" ("ad_group_id");
CREATE INDEX "ads_campaign_id_idx" ON "ads" ("campaign_id");
CREATE INDEX "ads_status_idx" ON "ads" ("status");
CREATE INDEX "ads_type_idx" ON "ads" ("type");
