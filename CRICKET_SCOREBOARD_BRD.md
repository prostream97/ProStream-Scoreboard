# Cricket Scoreboard Web App — Concise BRD
> Version 1.0 | ProStream Platform Extension | Ready for Claude Code

---

## 1. Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 |
| Styling | Tailwind CSS |
| Real-Time | Pusher Channels (serverless, client-triggered) |
| Database | Neon PostgreSQL (serverless, free tier) |
| ORM | Drizzle ORM + Neon serverless driver |
| Media | Cloudinary (player headshots, team logos) |
| State (OCP) | Zustand (browser memory — ball-by-ball buffer) |
| Auth | NextAuth.js v5 (operator sessions only) |
| Hosting | Vercel (Hobby plan) |

---

## 2. Core Architecture

```
Operator (OCP Browser)
  │
  ├─ Ball scored → Zustand (in-memory, instant)
  │                    │
  │                    ├──► Pusher trigger → /api/pusher/trigger (every ball)
  │                    │         └──► All viewers + overlays update
  │                    │
  │                    └──► Neon write → /api/match/persist (once per over)
  │                              └──► Triggered on: over complete | wicket | pause | innings end
  │
Viewer Display (/viewer/[matchId])
  └─ Pusher subscriber (passive, no auth)
  └─ On reconnect: GET /api/match/[matchId]/state (Neon snapshot)

OBS Overlay (/overlay/[matchId])
  └─ Pusher subscriber (transparent bg, 1920x1080)
```

---

## 3. Database Schema (Neon / Drizzle)

```typescript
// matches
id, format, status, venue, date, totalOvers, homeTeamId, awayTeamId, tossWinner, tossDecision, createdAt

// teams
id, name, shortCode (3 chars), primaryColor, secondaryColor, logoCloudinaryId

// players
id, teamId, name, displayName, role (batsman|bowler|allrounder|keeper), 
battingStyle, bowlingStyle, headshotCloudinaryId

// innings
id, matchId, battingTeamId, bowlingTeamId, inningsNumber (1|2),
totalRuns, wickets, overs, balls, status (active|complete|declared)

// deliveries  ← append-only, never UPDATE
id, inningsId, overNumber, ballNumber, batsmanId, bowlerId,
runs, isLegal (bool), extraType (wide|noball|bye|legbye|null),
extraRuns, isWicket (bool), dismissalType, fielder1Id, fielder2Id, timestamp

// partnerships
id, inningsId, batter1Id, batter2Id, runs, balls, startOver

// match_state  ← single row per match, updated once per over
matchId, currentInnings, currentOver, currentBalls, currentOverBuffer (JSON),
lastUpdated
```

**Key Rule:** All stats (run rate, strike rate, economy) are computed via SQL aggregation at read time — never stored as columns.

---

## 4. Pusher Events

| Event | Trigger | Payload |
|---|---|---|
| `delivery.added` | Every ball | `{ runs, isWicket, extras, batsmanId, bowlerId, overNumber, ballNumber }` |
| `wicket.fell` | Wicket only | `{ batsmanId, dismissalType, fielders, nextBatsmanId }` |
| `over.complete` | 6th legal delivery | `{ overNumber, overRuns, bowlerId, maidens }` |
| `innings.change` | Innings end | `{ inningsNumber, totalRuns, wickets, overs }` |
| `display.toggle` | Operator toggle | `{ element, visible }` |
| `dls.update` | DLS calculated | `{ revisedTarget, revisedOvers, parScore }` |
| `break.start` | Play suspended | `{ reason, message }` |
| `break.end` | Play resumed | `{}` |
| `match.state` | Force refresh | Full state snapshot |

---

## 5. API Routes

```
POST /api/pusher/auth              → Pusher channel auth
POST /api/pusher/trigger           → Trigger Pusher event (called every ball)
POST /api/match/persist            → Batch write over to Neon (once per over)
GET  /api/match/[matchId]/state    → Full state snapshot (reconnect recovery)
POST /api/match/create             → Create new match
POST /api/match/[matchId]/innings  → Start/end innings
GET  /api/teams                    → List saved teams
POST /api/teams                    → Create/update team profile
POST /api/teams/[teamId]/players   → Add players (or CSV import)
POST /api/cloudinary/sign          → Signed upload URL for media
```

---

## 6. Pages & Routes

```
/                          → Dashboard (list matches)
/match/new                 → Match setup wizard
/match/[matchId]/operator  → Operator Control Panel (OCP) — auth required
/viewer/[matchId]          → Public viewer display (no auth)
/overlay/[matchId]         → OBS browser source (transparent bg)
/admin/teams               → Team profile management
/admin/players             → Player roster management
```

---

## 7. Operator Control Panel (OCP) Layout

```
┌─────────────────────────────────────────────────────────┐
│  MATCH HEADER: Teams | Score | Overs | CRR | RRR        │
├──────────────┬──────────────────────┬────────────────────┤
│ BATTING       │   SCORING CONTROLS   │  BOWLING           │
│               │                      │                    │
│ Batter 1 *   │  [ 0 ][ 1 ][ 2 ]    │  Bowler Name       │
│ runs (balls) │  [ 3 ][ 4 ][ 6 ]    │  O-M-R-W  Econ     │
│              │                      │                    │
│ Batter 2     │  [WD][NB][BYE][LB]  │  ── OVER LOG ──    │
│ runs (balls) │                      │  • • 4 • W •       │
│              │  [ WICKET ]          │  ● ● ● ● ● ●  ← 6 │
│ Partnership  │  [ UNDO  ]           │  delivery dots     │
│ runs (balls) │                      │                    │
├──────────────┴──────────────────────┴────────────────────┤
│  [Start] [Pause] [Break] [End Innings] [DLS] [Refresh]  │
│  [Lower Third] [Ticker] [Toggle Elements] [Layout]      │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Zustand Store Structure (OCP)

```typescript
interface MatchStore {
  // Current over buffer (in-memory, not in DB until over complete)
  currentOverBalls: Delivery[];
  legalDeliveryCount: number;

  // Live match state (computed from Neon snapshot + current over buffer)
  innings: InningsState;
  striker: Player;
  nonStriker: Player;
  currentBowler: Player;

  // Actions
  addDelivery: (d: Delivery) => Promise<void>;  // ball scored
  undoDelivery: () => void;                      // undo last ball
  flushOverToNeon: () => Promise<void>;          // persist batch
  toggleStrike: () => void;                      // swap striker

  // Flush triggers (all call flushOverToNeon)
  // - over complete (6 legal deliveries)
  // - wicket
  // - innings end
  // - match pause
  // - every 3rd legal delivery (safety checkpoint)
}
```

---

## 9. Display Modes

| Mode | Route | Description |
|---|---|---|
| Full Scoreboard | `/viewer/[id]` | All stats, responsive, dark/light theme |
| Scorebug | `/overlay/[id]?mode=bug` | Compact bottom bar for OBS |
| Player Card | `/overlay/[id]?mode=card` | Lower third, triggered by operator |
| Wicket Alert | `/overlay/[id]?mode=wicket` | Full screen flash animation |
| Partnership | `/overlay/[id]?mode=partnership` | Current pair stats |

---

## 10. Key Feature Specs

### Scoring
- Buttons: 0, 1, 2, 3, 4, 6 + WD, NB, BYE, LB
- Wicket flow: select dismissal type → select fielder(s) → select next batsman
- Undo: reverses last delivery, restores all affected stats (min 10 deep)
- Keyboard shortcuts: `0-6` = runs, `W` = wicket, `U` = undo, `P` = pause

### Stats Computed in SQL (never stored)
- Current Run Rate: `SUM(runs) / overs`
- Required Run Rate: `(target - runs) / remaining overs`
- Strike Rate: `(runs / balls) * 100`
- Economy: `runs / overs`
- Partnership: `SUM(runs) since last wicket`

### DLS
- Manual input: overs completed at interruption, overs available on resumption
- Output: revised target, par score, over-by-over par table
- Operator pushes revised target to all displays via `dls.update` Pusher event

### Media (Cloudinary)
- Upload path: `/teams/{teamId}/logo`, `/players/{playerId}/headshot`
- Transform on upload: `c_fill, g_face, w_400, h_400, f_webp`
- Served via Cloudinary CDN — never via Neon or Vercel

---

## 11. Design Tokens (ProStream System)

```css
--color-primary:    #4F46E5;   /* Indigo */
--color-secondary:  #10B981;   /* Emerald */
--color-accent:     #8B5CF6;   /* Purple */
--color-overlay-lime: #A3E635; /* Electric lime — broadcast live indicator */
--color-overlay-cyan: #06B6D4; /* Neon cyan — stat highlights */
--color-surface-1:  #0F172A;   /* Darkest bg */
--color-surface-2:  #1E293B;   /* Card bg */
--color-surface-3:  #334155;   /* Elevated surface */

/* Typography */
--font-display:  'Bebas Neue';      /* Score numbers, match title */
--font-stats:    'Rajdhani';        /* Stat labels, compact data */
--font-body:     'Inter';           /* UI text */
--font-overlay:  'Barlow Condensed'; /* OBS overlay text */

/* Spacing */
--grid: 8px; /* 8pt grid — all spacing multiples of 8 */
```

---

## 12. Environment Variables

```bash
# Pusher
PUSHER_APP_ID=2130666
PUSHER_KEY=7c860b4214e1418bd830
PUSHER_SECRET=bddd714c06fbd2b4b7f9
PUSHER_CLUSTER=ap2
NEXT_PUBLIC_PUSHER_KEY=7c860b4214e1418bd830
NEXT_PUBLIC_PUSHER_CLUSTER=ap2

# Neon
DATABASE_URL=postgresql://neondb_owner:npg_HirfNW1oBP6d@ep-wild-hat-a16oc9wp-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require           # Pooled connection (IPv4 compatible)

# Cloudinary
CLOUDINARY_CLOUD_NAME=dcv4wu1b6
CLOUDINARY_API_KEY=799354757436411
CLOUDINARY_API_SECRET=osCkxMSO4iBnAz5HPdtqkQjatYY

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

---

## 13. Neon Cost Guards

| Rule | Implementation |
|---|---|
| Write once per over | Zustand buffers balls; flush only on over complete / wicket / pause |
| No polling Neon | All real-time via Pusher; Neon read only on page load / reconnect |
| SELECT only needed columns | Never `SELECT *` — always specify columns |
| No viewer session logging | Use Pusher presence channels instead |
| No computed columns | CRR, RRR, SR computed in SQL at query time |

---

## 14. Build Phases

| Phase | Deliverables | Priority |
|---|---|---|
| 0 | DB schema, Drizzle setup, Neon connection, Pusher auth, NextAuth | Foundation |
| 1 | OCP scoring buttons, Zustand store, Pusher trigger, viewer display | **Start here** |
| 2 | Wicket flow, undo, over completion, Neon persist | Core loop complete |
| 3 | Full batting/bowling stats, partnerships, run rates | Statistics |
| 4 | Team/player profiles, CSV import, Cloudinary upload | Data management |
| 5 | OBS overlay variants, lower thirds, ticker, display toggles | Broadcast |
| 6 | DLS calculator, match formats, break-in-play | Advanced |
| 7 | Testing, performance, production deploy | Launch |

---

*ProStream Cricket Scoreboard — BRD v1.0 Concise | March 2026*
