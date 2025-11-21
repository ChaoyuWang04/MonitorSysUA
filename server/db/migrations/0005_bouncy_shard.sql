CREATE TABLE "optimizer_leaderboard" (
	"id" serial PRIMARY KEY NOT NULL,
	"optimizer_email" varchar(100) NOT NULL,
	"total_operations" integer DEFAULT 0 NOT NULL,
	"excellent_count" integer DEFAULT 0 NOT NULL,
	"qualified_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"success_rate" numeric(10, 2) DEFAULT '0' NOT NULL,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "optimizer_leaderboard_optimizer_email_unique" UNIQUE("optimizer_email")
);
--> statement-breakpoint
CREATE INDEX "success_rate_idx" ON "optimizer_leaderboard" USING btree ("success_rate");
