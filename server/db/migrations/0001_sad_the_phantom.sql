CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"name" text NOT NULL,
	"currency" text,
	"time_zone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_synced_at" timestamp,
	CONSTRAINT "accounts_customer_id_unique" UNIQUE("customer_id")
);
--> statement-breakpoint
DROP INDEX "unique_event";--> statement-breakpoint
ALTER TABLE "change_events" ADD COLUMN "account_id" integer NOT NULL;--> statement-breakpoint
CREATE INDEX "customer_id_idx" ON "accounts" USING btree ("customer_id");--> statement-breakpoint
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_id_idx" ON "change_events" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "account_timestamp_idx" ON "change_events" USING btree ("account_id","timestamp");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_event" ON "change_events" USING btree ("account_id","timestamp","resource_name","user_email");
