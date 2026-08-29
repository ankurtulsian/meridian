import { promises as fs } from 'fs'
import path from 'path'
import { AppState, isStale, seedState } from './session'

// The whole of persistence, on purpose.
//
// A JSON file, behind four functions. Postgres is the intended home — history is
// the asset and a file is not where an asset lives — but at this size there is no
// history worth keeping, and a database in front of the first run is a signup step
// before anything works. Swapping it is this file and nothing else: no caller
// knows where the state came from.

const FILE = path.join(process.cwd(), '.data', 'state.json')

// One writer at a time. Two overlapping requests would otherwise interleave a
// read-modify-write and silently lose a turn.
let queue: Promise<unknown> = Promise.resolve()

function serial<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn)
  queue = next.catch(() => undefined)
  return next
}

async function load(): Promise<AppState | null> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    return JSON.parse(raw) as AppState
  } catch {
    return null
  }
}

async function save(state: AppState): Promise<void> {
  await fs.mkdir(path.dirname(FILE), { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(state, null, 2), 'utf8')
}

export function read(): Promise<AppState> {
  return serial(async () => {
    const existing = await load()
    // A day rolls over into a fresh one rather than accumulating yesterday's
    // conversation under today's date.
    if (existing && !isStale(existing)) return existing
    const fresh = seedState()
    await save(fresh)
    return fresh
  })
}

export function write(state: AppState): Promise<void> {
  return serial(() => save(state))
}

export function reset(): Promise<AppState> {
  return serial(async () => {
    const fresh = seedState()
    await save(fresh)
    return fresh
  })
}
