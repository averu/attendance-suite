CREATE TYPE "public"."leave_grant_source" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "leave_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"grant_date" date NOT NULL,
	"granted_days" numeric(5, 1) NOT NULL,
	"source" "leave_grant_source" DEFAULT 'manual' NOT NULL,
	"note" text,
	"created_by_user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leave_grant" ADD CONSTRAINT "leave_grant_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_grant" ADD CONSTRAINT "leave_grant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_grant" ADD CONSTRAINT "leave_grant_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leave_grant_user_date_uniq" ON "leave_grant" USING btree ("organization_id","user_id","grant_date");--> statement-breakpoint
CREATE INDEX "leave_grant_org_user_idx" ON "leave_grant" USING btree ("organization_id","user_id");