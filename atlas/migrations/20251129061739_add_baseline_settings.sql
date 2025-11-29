-- Create "baseline_settings" table
CREATE TABLE "baseline_settings" (
  "id" serial NOT NULL,
  "app_id" text NOT NULL,
  "geo" text NOT NULL,
  "media_source" text NOT NULL,
  "baseline_days" integer NOT NULL DEFAULT 180,
  "min_sample_size" integer NOT NULL DEFAULT 30,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);
-- Create index "unique_baseline_setting" to table: "baseline_settings"
CREATE UNIQUE INDEX "unique_baseline_setting" ON "baseline_settings" ("app_id", "geo", "media_source");
