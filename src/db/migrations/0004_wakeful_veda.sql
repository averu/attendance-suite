ALTER TABLE "organization" ADD COLUMN "daily_scheduled_minutes" integer DEFAULT 480 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "weekly_scheduled_minutes" integer DEFAULT 2400 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "legal_holiday_dow" integer DEFAULT 0 NOT NULL;