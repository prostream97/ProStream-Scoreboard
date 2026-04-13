import { neonConfig, Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'

// Node.js 21+ ships WebSocket natively — no ws package needed.
// This is required for neon-serverless (WebSocket) to work in Node.js runtime.
if (typeof globalThis.WebSocket === 'undefined') {
  // Fallback only needed if running on Node < 21 (shouldn't happen with Node 22)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  neonConfig.webSocketConstructor = require('ws')
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL! })

export const db = drizzle(pool, { schema })
