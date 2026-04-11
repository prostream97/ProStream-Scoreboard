ALTER TABLE "matches" ADD COLUMN "result_winner_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_margin" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "result_type" text;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_result_winner_id_teams_id_fk" FOREIGN KEY ("result_winner_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;
