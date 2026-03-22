CREATE TYPE "public"."batting_style" AS ENUM('right-hand', 'left-hand');--> statement-breakpoint
CREATE TYPE "public"."bowling_style" AS ENUM('right-arm-fast', 'right-arm-medium', 'right-arm-offbreak', 'right-arm-legbreak', 'left-arm-fast', 'left-arm-medium', 'left-arm-orthodox', 'left-arm-chinaman');--> statement-breakpoint
CREATE TYPE "public"."dismissal_type" AS ENUM('bowled', 'caught', 'lbw', 'runout', 'stumped', 'hitwicket', 'obstructingfield', 'handledball', 'timedout');--> statement-breakpoint
CREATE TYPE "public"."extra_type" AS ENUM('wide', 'noball', 'bye', 'legbye');--> statement-breakpoint
CREATE TYPE "public"."innings_status" AS ENUM('active', 'complete', 'declared');--> statement-breakpoint
CREATE TYPE "public"."match_format" AS ENUM('T20', 'ODI', 'T10', 'custom');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('setup', 'active', 'paused', 'break', 'complete');--> statement-breakpoint
CREATE TYPE "public"."player_role" AS ENUM('batsman', 'bowler', 'allrounder', 'keeper');--> statement-breakpoint
CREATE TYPE "public"."toss_decision" AS ENUM('bat', 'field');--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" serial PRIMARY KEY NOT NULL,
	"innings_id" integer NOT NULL,
	"over_number" integer NOT NULL,
	"ball_number" integer NOT NULL,
	"batsman_id" integer NOT NULL,
	"bowler_id" integer NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"extra_runs" integer DEFAULT 0 NOT NULL,
	"is_legal" boolean DEFAULT true NOT NULL,
	"extra_type" "extra_type",
	"is_wicket" boolean DEFAULT false NOT NULL,
	"dismissal_type" "dismissal_type",
	"fielder1_id" integer,
	"fielder2_id" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "innings" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"batting_team_id" integer NOT NULL,
	"bowling_team_id" integer NOT NULL,
	"innings_number" integer NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"wickets" integer DEFAULT 0 NOT NULL,
	"overs" integer DEFAULT 0 NOT NULL,
	"balls" integer DEFAULT 0 NOT NULL,
	"target" integer,
	"status" "innings_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"current_innings" integer DEFAULT 1 NOT NULL,
	"current_over" integer DEFAULT 0 NOT NULL,
	"current_balls" integer DEFAULT 0 NOT NULL,
	"striker_id" integer,
	"non_striker_id" integer,
	"current_bowler_id" integer,
	"current_over_buffer" jsonb DEFAULT '[]'::jsonb,
	"last_updated" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "match_state_match_id_unique" UNIQUE("match_id")
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"format" "match_format" DEFAULT 'T20' NOT NULL,
	"status" "match_status" DEFAULT 'setup' NOT NULL,
	"venue" text,
	"date" timestamp DEFAULT now() NOT NULL,
	"total_overs" integer DEFAULT 20 NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team_id" integer NOT NULL,
	"toss_winner_id" integer,
	"toss_decision" "toss_decision",
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partnerships" (
	"id" serial PRIMARY KEY NOT NULL,
	"innings_id" integer NOT NULL,
	"batter1_id" integer NOT NULL,
	"batter2_id" integer NOT NULL,
	"runs" integer DEFAULT 0 NOT NULL,
	"balls" integer DEFAULT 0 NOT NULL,
	"start_over" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"role" "player_role" DEFAULT 'batsman' NOT NULL,
	"batting_style" "batting_style" DEFAULT 'right-hand',
	"bowling_style" "bowling_style",
	"headshot_cloudinary_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_code" char(3) NOT NULL,
	"primary_color" varchar(7) DEFAULT '#4F46E5' NOT NULL,
	"secondary_color" varchar(7) DEFAULT '#10B981' NOT NULL,
	"logo_cloudinary_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_innings_id_innings_id_fk" FOREIGN KEY ("innings_id") REFERENCES "public"."innings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_batsman_id_players_id_fk" FOREIGN KEY ("batsman_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_bowler_id_players_id_fk" FOREIGN KEY ("bowler_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_fielder1_id_players_id_fk" FOREIGN KEY ("fielder1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_fielder2_id_players_id_fk" FOREIGN KEY ("fielder2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innings" ADD CONSTRAINT "innings_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innings" ADD CONSTRAINT "innings_batting_team_id_teams_id_fk" FOREIGN KEY ("batting_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "innings" ADD CONSTRAINT "innings_bowling_team_id_teams_id_fk" FOREIGN KEY ("bowling_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_state" ADD CONSTRAINT "match_state_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_state" ADD CONSTRAINT "match_state_striker_id_players_id_fk" FOREIGN KEY ("striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_state" ADD CONSTRAINT "match_state_non_striker_id_players_id_fk" FOREIGN KEY ("non_striker_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_state" ADD CONSTRAINT "match_state_current_bowler_id_players_id_fk" FOREIGN KEY ("current_bowler_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_toss_winner_id_teams_id_fk" FOREIGN KEY ("toss_winner_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_innings_id_innings_id_fk" FOREIGN KEY ("innings_id") REFERENCES "public"."innings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_batter1_id_players_id_fk" FOREIGN KEY ("batter1_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partnerships" ADD CONSTRAINT "partnerships_batter2_id_players_id_fk" FOREIGN KEY ("batter2_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;