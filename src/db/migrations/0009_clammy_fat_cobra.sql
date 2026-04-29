CREATE TYPE "public"."labor_category" AS ENUM('general', 'manager');--> statement-breakpoint
ALTER TABLE "membership" ADD COLUMN "labor_category" "labor_category" DEFAULT 'general' NOT NULL;