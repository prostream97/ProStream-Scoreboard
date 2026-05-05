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
  uniqueIndex,
  date,
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
  'penalty',
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

export const tournamentStatusEnum = pgEnum('tournament_status', [
  'upcoming',
  'group_stage',
  'knockout',
  'complete',
])

export const matchStageEnum = pgEnum('match_stage', [
  'group',
  'quarter_final',
  'semi_final',
  'final',
  'third_place',
])

export const userRoleEnum = pgEnum('user_role', ['admin', 'operator'])

export const overlayModeEnum = pgEnum('overlay_mode', ['bug', 'card', 'partnership', 'boundary', 'standard', 'icc2023', 'standard1', 'theme1'])

export const transactionTypeEnum = pgEnum('transaction_type', ['topup', 'deduction'])

export const planTypeEnum = pgEnum('plan_type', ['tournament', 'match', 'daily'])

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    username: varchar('username', { length: 50 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    role: userRoleEnum('role').notNull().default('operator'),
    phone: varchar('phone', { length: 20 }),
    photoCloudinaryId: text('photo_cloudinary_id'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    usernameIdx: uniqueIndex('users_username_idx').on(table.username),
  }),
)

// ─── Tournaments ──────────────────────────────────────────────────────────────
// Defined before teams so teams can reference it

export const tournaments = pgTable('tournaments', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  shortName: varchar('short_name', { length: 20 }).notNull(),
  status: tournamentStatusEnum('status').notNull().default('upcoming'),
  format: matchFormatEnum('format').notNull().default('T20'),
  totalOvers: integer('total_overs').notNull().default(20),
  ballsPerOver: integer('balls_per_over').notNull().default(6),
  logoCloudinaryId: text('logo_cloudinary_id'),
  createdBy: integer('created_by').references(() => users.id),
  matchDaysFrom: date('match_days_from'),
  matchDaysTo: date('match_days_to'),
  planType: planTypeEnum('plan_type').notNull().default('tournament'),
  matchLimit: integer('match_limit'),
  planDay: date('plan_day'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Tournament Groups ────────────────────────────────────────────────────────

export const tournamentGroups = pgTable('tournament_groups', {
  id: serial('id').primaryKey(),
  tournamentId: integer('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 50 }).notNull(),
  shortName: varchar('short_name', { length: 10 }).notNull(),
  qualifyCount: integer('qualify_count').notNull().default(2),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Teams ────────────────────────────────────────────────────────────────────

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  tournamentId: integer('tournament_id')
    .notNull()
    .references(() => tournaments.id, { onDelete: 'cascade' }),
  groupId: integer('group_id').references(() => tournamentGroups.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  shortCode: char('short_code', { length: 3 }).notNull(),
  primaryColor: varchar('primary_color', { length: 7 }).notNull().default('#4F46E5'),
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
  ballsPerOver: integer('balls_per_over').notNull().default(6),
  homeTeamId: integer('home_team_id')
    .notNull()
    .references(() => teams.id),
  awayTeamId: integer('away_team_id')
    .notNull()
    .references(() => teams.id),
  tossWinnerId: integer('toss_winner_id').references(() => teams.id),
  tossDecision: tossDecisionEnum('toss_decision'),
  tournamentId: integer('tournament_id').references(() => tournaments.id, { onDelete: 'set null' }),
  groupId: integer('group_id').references(() => tournamentGroups.id, { onDelete: 'set null' }),
  matchStage: matchStageEnum('match_stage'),
  matchLabel: varchar('match_label', { length: 20 }),
  resultWinnerId: integer('result_winner_id').references(() => teams.id),
  resultMargin: integer('result_margin'),
  resultType: text('result_type').$type<'wickets' | 'runs' | 'tie'>(),
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
  isBoundary: boolean('is_boundary').notNull().default(false),
  // isLegal = false for WD and NB only; true for all others (including bye/legbye)
  isLegal: boolean('is_legal').notNull().default(true),
  extraType: extraTypeEnum('extra_type'),
  isWicket: boolean('is_wicket').notNull().default(false),
  dismissalType: dismissalTypeEnum('dismissal_type'),
  dismissedBatterId: integer('dismissed_batter_id').references(() => players.id),
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

// ─── Overlay Links ────────────────────────────────────────────────────────────
// Shareable, token-based URLs for OBS overlays. Soft-revocable via isActive.

export const overlayLinks = pgTable('overlay_links', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matches.id, { onDelete: 'cascade' }),
  tournamentId: integer('tournament_id').references(() => tournaments.id, { onDelete: 'cascade' }),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  mode: overlayModeEnum('mode').notNull().default('standard'),
  label: text('label'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Wallets ──────────────────────────────────────────────────────────────────
// One wallet per user. Balance stored as integer LKR (no decimals).

export const wallets = pgTable('wallets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Wallet Transactions ──────────────────────────────────────────────────────
// Immutable audit log. Never UPDATE rows — only INSERT.

export const walletTransactions = pgTable('wallet_transactions', {
  id: serial('id').primaryKey(),
  walletId: integer('wallet_id')
    .notNull()
    .references(() => wallets.id, { onDelete: 'cascade' }),
  type: transactionTypeEnum('type').notNull(),
  amount: integer('amount').notNull(),          // positive for topup, negative for deduction
  balanceBefore: integer('balance_before').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  description: text('description').notNull(),
  referenceId: integer('reference_id'),         // overlayLinkId for deductions
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// ─── Tournament Access ────────────────────────────────────────────────────────
// Junction table: which users can access which tournaments (operators only).
// Admins bypass this entirely — they always see all tournaments.

export const tournamentAccess = pgTable(
  'tournament_access',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tournamentId: integer('tournament_id').notNull().references(() => tournaments.id, { onDelete: 'cascade' }),
    grantedAt: timestamp('granted_at').notNull().defaultNow(),
    grantedBy: integer('granted_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    uniqueAccess: uniqueIndex('tournament_access_user_tournament_idx').on(table.userId, table.tournamentId),
  }),
)

// ─── Pricing Config ───────────────────────────────────────────────────────────
// Admin-configurable key→value price table (values in LKR).
// Default rows seeded: overlay_per_match=100, overlay_per_tournament=500

export const pricingConfig = pgTable('pricing_config', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 64 }).notNull().unique(),
  value: integer('value').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// ─── Relations ────────────────────────────────────────────────────────────────

export const tournamentsRelations = relations(tournaments, ({ many }) => ({
  teams: many(teams),
  matches: many(matches),
  groups: many(tournamentGroups),
}))

export const tournamentGroupsRelations = relations(tournamentGroups, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [tournamentGroups.tournamentId],
    references: [tournaments.id],
  }),
  teams: many(teams),
  matches: many(matches),
}))

export const teamsRelations = relations(teams, ({ one, many }) => ({
  tournament: one(tournaments, {
    fields: [teams.tournamentId],
    references: [tournaments.id],
  }),
  group: one(tournamentGroups, {
    fields: [teams.groupId],
    references: [tournamentGroups.id],
  }),
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
  tournament: one(tournaments, {
    fields: [matches.tournamentId],
    references: [tournaments.id],
  }),
  group: one(tournamentGroups, {
    fields: [matches.groupId],
    references: [tournamentGroups.id],
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

export const overlayLinksRelations = relations(overlayLinks, ({ one }) => ({
  match: one(matches, { fields: [overlayLinks.matchId], references: [matches.id] }),
  tournament: one(tournaments, { fields: [overlayLinks.tournamentId], references: [tournaments.id] }),
  user: one(users, { fields: [overlayLinks.userId], references: [users.id] }),
}))

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}))

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
}))

export const tournamentAccessRelations = relations(tournamentAccess, ({ one }) => ({
  user: one(users, { fields: [tournamentAccess.userId], references: [users.id] }),
  tournament: one(tournaments, { fields: [tournamentAccess.tournamentId], references: [tournaments.id] }),
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
  isBoundary: boolean
  extraType: 'wide' | 'noball' | 'bye' | 'legbye' | 'penalty' | null
  isWicket: boolean
  dismissalType: string | null
  dismissedBatterId?: number | null
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
export type Tournament = typeof tournaments.$inferSelect
export type NewTournament = typeof tournaments.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type OverlayLink = typeof overlayLinks.$inferSelect
export type NewOverlayLink = typeof overlayLinks.$inferInsert
export type Wallet = typeof wallets.$inferSelect
export type WalletTransaction = typeof walletTransactions.$inferSelect
export type PricingConfig = typeof pricingConfig.$inferSelect
export type TournamentAccess = typeof tournamentAccess.$inferSelect
export type TournamentGroup = typeof tournamentGroups.$inferSelect
export type NewTournamentGroup = typeof tournamentGroups.$inferInsert
