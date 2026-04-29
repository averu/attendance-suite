ALTER TABLE "membership" ADD COLUMN "hire_date" date;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "weekly_scheduled_days" integer;--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "weekly_scheduled_hours" numeric(4, 1);