import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  varchar,
  char,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const matchFormatEnum = pgEnum('match_format', [
  'T20',
  'ODI',
  'T10',
  'custom',
])

export const matchStatusEnum = pgEnum('match_status', [
  'setup',
  'active',
  'paused',
  'break',
  'complete',
])

export const tossDecisionEnum = pgEnum('toss_decision', ['bat', 'field'])

export const playerRoleEnum = pgEnum('player_role', [
  'batsman',
  'bowler',
  'allrounder',
  'keeper',
])

export const battingStyleEnum = pgEnum('batting_style', [
  'right-hand',
  'left-hand',
])

export const bowlingStyleEnum = pgEnum('bowling_style', [
  'right-arm-fast',
  'right-arm-medium',
  'right-arm-offbreak',
  'right-arm-legbreak',
  'left-arm-fast',
  'left-arm-medium',
  'left-arm-orthodox',
  'left-arm-chinaman',
])

export const extraTypeEnum = pgEnum('extra_type', [
  'wide',
  'noball',
  'bye',
  'legbye',
])

export const dismissalTypeEnum = pgEnum('dismissal_type', [
  'bowled',
  'caught',
  'lbw',
  'runout',
  'stumped',
  'hitwicket',
  'obstructingfield',
  'handledball',
  'timedout',
])

export const inningsStatusEnum = pgEnum('innings_status', [
  'active',
  'complete',
  'declared',
])

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  shortCode: char('short_code', { length: 3 }).notNull(),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#4F46E5'),
  secondaryColor: varchar('secondary_color', { length: 7 }).notNull().default('#10B981'),
  logoCloudinaryId: text('logo_cloudinary_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Players ──────────────────────────────────────────────────────────────────

export const players = pgTable('players', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  role: playerRoleEnum('role').notNull().default('batsman'),
  battingStyle: battingStyleEnum('batting_style').default('right-hand'),
  bowlingStyle: bowlingStyleEnum('bowling_style'),
  headshotCloudinaryId: text('headshot_cloudinary_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Matches ──────────────────────────────────────────────────────────────────

export const matches = pgTable('matches', {
  id: serial('id').primaryKey(),
  format: matchFormatEnum('format').notNull().default('T20'),
  status: matchStatusEnum('status').notNull().default('setup'),
  venue: text('venue'),
  date: timestamp('date').defaultNow().notNull(),
  totalOvers: integer('total_overs').notNull().default(20),
  homeTeamId: integer('home_team_id')
    .notNull()
    .references(() => teams.id),
  awayTeamId: integer('away_team_id')
    .notNull()
    .references(() => teams.id),
  tossWinnerId: integer('toss_winner_id').references(() => teams.id),
  tossDecision: tossDecisionEnum('toss_decision'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Innings ──────────────────────────────────────────────────────────────────

export const innings = pgTable('innings', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' }),
  battingTeamId: integer('batting_team_id')
    .notNull()
    .references(() => teams.id),
  bowlingTeamId: integer('bowling_team_id')
    .notNull()
    .references(() => teams.id),
  inningsNumber: integer('innings_number').notNull(), // 1 or 2
  totalRuns: integer('total_runs').notNull().default(0),
  wickets: integer('wickets').notNull().default(0),
  overs: integer('overs').notNull().default(0),       // completed overs
  balls: integer('balls').notNull().default(0),        // balls in current over (0-5)
  target: integer('target'),                           // set after innings 1 complete
  status: inningsStatusEnum('status').notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Deliveries ───────────────────────────────────────────────────────────────
// Append-only. Never UPDATE — only INSERT (and DELETE for undo).

export const deliveries = pgTable('deliveries', {
  id: serial('id').primaryKey(),
  inningsId: integer('innings_id')
    .notNull()
    .references(() => innings.id, { onDelete: 'cascade' }),
  overNumber: integer('over_number').notNull(),  // 0-indexed
  ballNumber: integer('ball_number').notNull(),  // 0-indexed within over (can exceed 5 for extras)
  batsmanId: integer('batsman_id')
    .notNull()
    .references(() => players.id),
  bowlerId: integer('bowler_id')
    .notNull()
    .references(() => players.id),
  runs: integer('runs').notNull().default(0),        // runs off the bat (not extras)
  extraRuns: integer('extra_runs').notNull().default(0),
  // isLegal = false for WD and NB only; true for all others (including bye/legbye)
  isLegal: boolean('is_legal').notNull().default(true),
  extraType: extraTypeEnum('extra_type'),
  isWicket: boolean('is_wicket').notNull().default(false),
  dismissalType: dismissalTypeEnum('dismissal_type'),
  fielder1Id: integer('fielder1_id').references(() => players.id),
  fielder2Id: integer('fielder2_id').references(() => players.id),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// ─── Partnerships ─────────────────────────────────────────────────────────────

export const partnerships = pgTable('partnerships', {
  id: serial('id').primaryKey(),
  inningsId: integer('innings_id')
    .notNull()
    .references(() => innings.id, { onDelete: 'cascade' }),
  batter1Id: integer('batter1_id')
    .notNull()
    .references(() => players.id),
  batter2Id: integer('batter2_id')
    .notNull()
    .references(() => players.id),
  runs: integer('runs').notNull().default(0),
  balls: integer('balls').notNull().default(0),
  startOver: integer('start_over').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Match State ──────────────────────────────────────────────────────────────
// Single row per match. Updated once per over (not every ball).
// currentOverBuffer stores the in-progress over's deliveries as JSON.

export const matchState = pgTable('match_state', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id')
    .notNull()
    .references(() => matches.id, { onDelete: 'cascade' })
    .unique(),
  currentInnings: integer('current_innings').notNull().default(1),
  currentOver: integer('current_over').notNull().default(0),    // 0-indexed
  currentBalls: integer('current_balls').notNull().default(0),  // legal balls in current over
  strikerId: integer('striker_id').references(() => players.id),
  nonStrikerId: integer('non_striker_id').references(() => players.id),
  currentBowlerId: integer('current_bowler_id').references(() => players.id),
  // JSON buffer of the current over's deliveries — flushed to deliveries table on over end
  currentOverBuffer: jsonb('current_over_buffer').$type<DeliveryBuffer[]>().default([]),
  lastUpdated: timestamp('last_updated').defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const teamsRelations = relations(teams, ({ many }) => ({
  players: many(players),
  homeMatches: many(matches, { relationName: 'homeTeam' }),
  awayMatches: many(matches, { relationName: 'awayTeam' }),
}))

export const playersRelations = relations(players, ({ one }) => ({
  team: one(teams, { fields: [players.teamId], references: [teams.id] }),
}))

export const matchesRelations = relations(matches, ({ one, many }) => ({
  homeTeam: one(teams, {
    fields: [matches.homeTeamId],
    references: [teams.id],
    relationName: 'homeTeam',
  }),
  awayTeam: one(teams, {
    fields: [matches.awayTeamId],
    references: [teams.id],
    relationName: 'awayTeam',
  }),
  innings: many(innings),
  state: one(matchState, {
    fields: [matches.id],
    references: [matchState.matchId],
  }),
}))

export const inningsRelations = relations(innings, ({ one, many }) => ({
  match: one(matches, { fields: [innings.matchId], references: [matches.id] }),
  battingTeam: one(teams, {
    fields: [innings.battingTeamId],
    references: [teams.id],
  }),
  bowlingTeam: one(teams, {
    fields: [innings.bowlingTeamId],
    references: [teams.id],
  }),
  deliveries: many(deliveries),
  partnerships: many(partnerships),
}))

export const deliveriesRelations = relations(deliveries, ({ one }) => ({
  innings: one(innings, {
    fields: [deliveries.inningsId],
    references: [innings.id],
  }),
  batsman: one(players, {
    fields: [deliveries.batsmanId],
    references: [players.id],
    relationName: 'batsman',
  }),
  bowler: one(players, {
    fields: [deliveries.bowlerId],
    references: [players.id],
    relationName: 'bowler',
  }),
}))

export const matchStateRelations = relations(matchState, ({ one }) => ({
  match: one(matches, {
    fields: [matchState.matchId],
    references: [matches.id],
  }),
}))

// ─── Types ────────────────────────────────────────────────────────────────────

export type DeliveryBuffer = {
  overNumber: number
  ballNumber: number
  batsmanId: number
  bowlerId: number
  runs: number
  extraRuns: number
  isLegal: boolean
  extraType: 'wide' | 'noball' | 'bye' | 'legbye' | null
  isWicket: boolean
  dismissalType: string | null
  fielder1Id: number | null
  fielder2Id: number | null
  timestamp: string
}

// Inferred types from Drizzle schema
export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
export type Player = typeof players.$inferSelect
export type NewPlayer = typeof players.$inferInsert
export type Match = typeof matches.$inferSelect
export type NewMatch = typeof matches.$inferInsert
export type Innings = typeof innings.$inferSelect
export type NewInnings = typeof innings.$inferInsert
export type Delivery = typeof deliveries.$inferSelect
export type NewDelivery = typeof deliveries.$inferInsert
export type Partnership = typeof partnerships.$inferSelect
export type NewPartnership = typeof partnerships.$inferInsert
export type MatchState = typeof matchState.$inferSelect
export type NewMatchState = typeof matchState.$inferInsert
