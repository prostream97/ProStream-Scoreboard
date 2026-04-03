CREATE TYPE "public"."match_stage" AS ENUM('group', 'quarter_final', 'semi_final', 'final', 'third_place');--> statement-breakpoint
CREATE TYPE "public"."tournament_status" AS ENUM('upcoming', 'group_stage', 'knockout', 'complete');--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" varchar(20) NOT NULL,
	"status" "tournament_status" DEFAULT 'upcoming' NOT NULL,
	"format" "match_format" DEFAULT 'T20' NOT NULL,
	"total_overs" integer DEFAULT 20 NOT NULL,
	"balls_per_over" integer DEFAULT 6 NOT NULL,
	"logo_cloudinary_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "balls_per_over" integer DEFAULT 6 NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "tournament_id" integer;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "match_stage" "match_stage";--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "match_label" varchar(20);--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "tournament_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;