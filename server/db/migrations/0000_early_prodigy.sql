CREATE TABLE "change_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"user_email" text NOT NULL,
	"resource_type" text NOT NULL,
	"operation_type" text NOT NULL,
	"resource_name" text NOT NULL,
	"client_type" text,
	"campaign" text,
	"ad_group" text,
	"summary" text NOT NULL,
	"field_changes" jsonb,
	"changed_fields_paths" jsonb
);
--> statement-breakpoint
CREATE INDEX "timestamp_idx" ON "change_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "change_events" USING btree ("user_email");--> statement-breakpoint
CREATE INDEX "resource_type_idx" ON "change_events" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "operation_type_idx" ON "change_events" USING btree ("operation_type");--> statement-breakpoint
CREATE INDEX "campaign_idx" ON "change_events" USING btree ("campaign");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_event" ON "change_events" USING btree ("timestamp","resource_name","user_email");
