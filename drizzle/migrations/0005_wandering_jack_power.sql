ALTER TYPE "public"."overlay_mode" ADD VALUE 'icc2023';--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "created_by" integer;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "match_days_from" date;--> statement-breakpoint
ALTER TABLE "tournaments" ADD COLUMN "match_days_to" date;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;