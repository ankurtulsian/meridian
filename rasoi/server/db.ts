import { neon } from '@neondatabase/serverless'
import { SCHEMA } from './schema'

// All contact with the driver, in one file.
//
// That is the same trick that made deferring the database safe in the first
// place: the store below knows SQL and nothing else, so the day this needs to be
// plain `pg` against something that is not Neon, it is this file and no other.
//
// **Why the HTTP driver and not a pool.** The failure being guarded against is
// running the Neon project out of connections — one function invocation per
// request, each opening its own socket.
//
// Neon's own recommendation for Vercel is node-postgres against the pooled
// endpoint, on Fluid compute, with `attachDatabasePool`. That is the right answer
// for an app with sustained traffic, where instances stay warm and a pool gets
// reused across many requests. It is not the right answer here. Three people
// planning dinner is not sustained traffic: with scale-to-zero on one side and a
// cold invocation on the other, a pool would be built and thrown away nearly
// every time, never amortising itself — and it would cost a second environment
// variable, because migrations must not run through PgBouncer.
//
// The HTTP driver holds no connection at all. There is nothing to exhaust,
// nothing left suspended when a function freezes, and nothing to warm up. It
// takes one connection string in whichever form gets pasted in. The cost is a
// round trip per batch, which is why everything below is a batch and never a
// query.
//
// If this ever grows real traffic, node-postgres on Fluid compute is the
// documented upgrade, and it is this file.

export interface Statement {
  text: string
  params?: unknown[]
}

export type Row = Record<string, unknown>

// One method on purpose. Reads and writes are both "run these statements together
// and give me the rows back", and a wider interface would be a wider thing to
// reimplement later.
export interface Db {
  batch(statements: Statement[]): Promise<Row[][]>
}

// A connection string is a password with a hostname attached. The host may be
// said out loud — it is what tells someone which database failed — and nothing
// else derived from the string may reach a log, a response body or a screen.
//
// The classic way a password ends up in a log aggregator is an error handler
// being helpful: a driver that echoes what it tried to connect to, wrapped by a
// catch that passes `error.message` straight through. So the string is never
// interpolated anywhere, and every message that leaves this file goes through the
// scrubber below as well — belt and braces, because the driver's wording is not
// ours to control and it can change in a patch release.
const CREDENTIALS = /\b[a-z][a-z0-9+.-]*:\/\/[^\s/@]*@/gi

export function redact(text: string): string {
  return text.replace(CREDENTIALS, '<redacted>@')
}

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'the configured host'
  }
}

export class DatabaseUnreachable extends Error {
  constructor(host: string, reason: string) {
    super(`Could not reach the database at ${host}. ${redact(reason)}`)
    this.name = 'DatabaseUnreachable'
  }
}

export class MissingDatabaseUrl extends Error {
  constructor() {
    super(
      'DATABASE_URL is not set, so there is nowhere to keep anything. ' +
        'On Vercel: Settings → Environment Variables → add DATABASE_URL with the ' +
        'Neon connection string, then redeploy. Running locally: put it in ' +
        'rasoi/.env.local as DATABASE_URL=postgresql://…'
    )
    this.name = 'MissingDatabaseUrl'
  }
}

function connect(url: string): Db {
  const sql = neon(url)
  const host = hostOf(url)
  return {
    async batch(statements) {
      if (!statements.length) return []
      try {
        const results = await sql.transaction(
          statements.map(s => sql.query(s.text, s.params ?? []))
        )
        return results as Row[][]
      } catch (error) {
        // Never rethrow the driver's own error object: its message, and its
        // cause chain, are outside our control.
        throw new DatabaseUnreachable(
          host,
          error instanceof Error ? error.message : String(error)
        )
      }
    },
  }
}

export function neonDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) throw new MissingDatabaseUrl()
  return connect(url)
}

// Schema changes want the direct endpoint, not the pooled one — PgBouncer runs in
// transaction mode and the ways it breaks DDL are all ways that do not mention
// pooling: a prepared statement that already exists, a SET that evaporates, a
// write landing in a read-only transaction inherited from someone else.
//
// So it is used when it is there and ignored when it is not. Neon's own tooling
// and the Vercel integration both set DATABASE_URL_UNPOOLED alongside
// DATABASE_URL, so this usually costs nobody anything; asking for it would be one
// more variable to mistype for a benefit that is invisible when it works.
function migrationDb(): Db {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
  if (!url) throw new MissingDatabaseUrl()
  return connect(url)
}

// Idempotent, and cheap enough to be worth not tracking. Once per process, not
// once per request — a cold start pays for it, a warm one does not.
let ensured: Promise<void> | null = null

export function ensureSchema(db?: Db): Promise<void> {
  if (!ensured) {
    const target = db ?? migrationDb()
    ensured = target.batch(SCHEMA.map(text => ({ text }))).then(
      () => undefined,
      error => {
        // A failed migration must not be remembered as done.
        ensured = null
        throw error
      }
    )
  }
  return ensured
}

// Only for tests, which run the identical SQL against Postgres-in-process.
export function resetSchemaMemo(): void {
  ensured = null
}
