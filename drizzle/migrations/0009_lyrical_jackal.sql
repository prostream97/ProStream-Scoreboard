ALTER TYPE "public"."extra_type" ADD VALUE 'penalty';--> statement-breakpoint
ALTER TYPE "public"."overlay_mode" ADD VALUE 'standard1';--> statement-breakpoint
ALTER TYPE "public"."overlay_mode" ADD VALUE 'theme1';--> statement-breakpoint
CREATE TABLE "tournament_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"short_name" varchar(10) NOT NULL,
	"qualify_count" integer DEFAULT 2 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deliveries" ADD COLUMN "is_boundary" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "matches" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN "group_id" integer;--> statement-breakpoint
ALTER TABLE "tournament_groups" ADD CONSTRAINT "tournament_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_group_id_tournament_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tournament_groups"("id") ON DELETE set null ON UPDATE no action;