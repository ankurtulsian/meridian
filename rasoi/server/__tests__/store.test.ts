import { PGlite } from '@electric-sql/pglite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { dayFlavour } from '../../lib/flavour'
import { DISH_BY_ID } from '../../lib/library'
import { Db, ensureSchema, redact, resetSchemaMemo, Row } from '../db'
import { PlanTurn } from '../planner'
import { SCHEMA } from '../schema'
import { isoDate } from '../session'
import { createStore } from '../store'
import { converseStubbed } from '../stub'

// Postgres in-process, running the identical SQL the deployed app runs. It cannot
// exercise anything Neon-specific — the HTTP driver, TLS negotiation, the pooled
// endpoint, a scale-to-zero cold start — but the schema, the statements and every
// derived reading are the same bytes.
function adapter(pg: PGlite): Db {
  return {
    async batch(statements) {
      const out: Row[][] = []
      await pg.exec('begin')
      try {
        for (const statement of statements) {
          const result = await pg.query(statement.text, (statement.params ?? []) as unknown[])
          out.push(result.rows as Row[])
        }
        await pg.exec('commit')
      } catch (error) {
        await pg.exec('rollback')
        throw error
      }
      return out
    },
  }
}

const DAY = 86_400_000
const TODAY = Date.parse('2026-09-10T16:00:00Z')
const at = (daysAgo: number) => new Date(TODAY - daysAgo * DAY).toISOString().slice(0, 10)

let pg: PGlite
let db: Db

// One Postgres for the file; the schema is dropped and rebuilt between tests.
// Booting the WASM build costs seconds, and paying it sixteen times is minutes of
// nothing happening.
beforeAll(async () => {
  pg = new PGlite()
  db = adapter(pg)
})

beforeEach(async () => {
  await pg.exec('drop schema if exists public cascade; create schema public;')
  resetSchemaMemo()
})

// Arranges history the way real use would have left it, without going through
// the store — which only ever writes today.
async function pastDay(date: string, dishIds: string[]) {
  await pg.query(`insert into days (the_date, eating) values ($1::date, $2::text[])`, [
    date,
    ['ankur', 'shruti', 'krishna'],
  ])
  for (const [ordinal, dishId] of dishIds.entries()) {
    await pg.query(
      `insert into plan_items (the_date, slot, dish_id, ordinal, source, outcome)
       values ($1::date, 'dinner', $2, $3, 'planned', 'cooked')`,
      [date, dishId, ordinal]
    )
  }
}

describe('boot', () => {
  it('creates the schema when it is absent', async () => {
    await ensureSchema(db)
    const { rows } = await pg.query<{ table_name: string }>(
      `select table_name from information_schema.tables where table_schema = 'public' order by 1`
    )
    expect(rows.map(r => r.table_name)).toEqual([
      'associations', 'days', 'edit_events', 'pantry_items', 'plan_items', 'plate_outcomes',
    ])
  })

  it('is safe to run again on every cold start', async () => {
    await ensureSchema(db)
    resetSchemaMemo()
    await expect(ensureSchema(db)).resolves.toBeUndefined()
    resetSchemaMemo()
    await db.batch(SCHEMA.map(text => ({ text })))
  })
})

describe('the first run', () => {
  it('has no history and does not invent any', async () => {
    const store = createStore(db, () => TODAY)
    const state = await store.read()

    expect(state.date).toBe(at(0))
    expect(state.slots.every(s => s.items.length === 0)).toBe(true)
    expect(state.lastServedAt).toEqual({})
    expect(state.trailingDays).toEqual([])
    expect(state.outcomes).toEqual([])
    expect(state.pantry).toEqual([])
  })

  it('says there is not enough history rather than guessing a baseline', () => {
    const reading = dayFlavour(DISH_BY_ID['khichdi'].nutrition, [])
    expect(reading.baselineKnown).toBe(false)
    expect(reading.summary).toMatch(/not enough history/i)
  })

  it('raises no findings about repeats or protein on an empty past', async () => {
    const store = createStore(db, () => TODAY)
    const turn = new PlanTurn(await store.read(), TODAY)
    turn.shortlist('dinner')
    const applied = turn.setPlan('dinner', ['khichdi'])
    expect(applied.ok).toBe(true)
    if (applied.ok) expect(applied.findings).toEqual([])
  })
})

describe('what is written comes back', () => {
  it('round-trips a day through Postgres unchanged', async () => {
    const store = createStore(db, () => TODAY)
    const before = await store.read()

    const turn = new PlanTurn(before, TODAY)
    turn.addTurn('user', 'something light')
    turn.stateConstraint({ dimension: 'mood', value: 'light', raw: 'something light', strength: 'preference' })
    turn.shortlist('dinner')
    turn.setPlan('dinner', ['khichdi', 'curd'])
    turn.setStage('converged')
    await store.write(turn.current)

    const after = await store.read()
    expect(after.slots.find(s => s.slot === 'dinner')!.items.map(i => i.dishId)).toEqual([
      'khichdi', 'curd',
    ])
    expect(after.stage).toBe('converged')
    expect(after.request.constraints).toHaveLength(1)
    expect(after.turns.map(t => t.text)).toContain('something light')
    // The fork travels with the item so the card can be rebuilt from a cold read.
    expect(after.slots.find(s => s.slot === 'dinner')!.items[0].fork).toBeDefined()
  })
})

describe('history is what the domain model actually reads', () => {
  it('derives the rotation clock from what was planned', async () => {
    await ensureSchema(db)
    await pastDay(at(3), ['bhindi-masala', 'roti'])
    await pastDay(at(9), ['khichdi'])

    const state = await createStore(db, () => TODAY).read()
    expect(state.lastServedAt['bhindi-masala']).toBe(Date.parse(`${at(3)}T00:00:00Z`))
    expect(state.lastServedAt['khichdi']).toBe(Date.parse(`${at(9)}T00:00:00Z`))
    expect(state.lastServedAt['pav-bhaji']).toBeUndefined()
  })

  it('does not let today count as the last time a dish was made', async () => {
    const store = createStore(db, () => TODAY)
    const turn = new PlanTurn(await store.read(), TODAY)
    turn.shortlist('dinner')
    turn.setPlan('dinner', ['khichdi'])
    await store.write(turn.current)

    // Otherwise the plan warns that the dish it just proposed was made today.
    expect((await store.read()).lastServedAt['khichdi']).toBeUndefined()
  })

  it('builds the macro baseline from the days behind today', async () => {
    await ensureSchema(db)
    await pastDay(at(1), ['rajma-chawal', 'roti'])
    await pastDay(at(2), ['khichdi', 'curd'])

    const state = await createStore(db, () => TODAY).read()
    expect(state.trailingDays).toHaveLength(2)
    // Oldest first, and summed from the library rather than from a frozen number.
    expect(state.trailingDays[0].proteinG).toBe(
      DISH_BY_ID['khichdi'].nutrition.proteinG + DISH_BY_ID['curd'].nutrition.proteinG
    )
  })

  it('treats a day nobody planned as absent, not as a day nobody ate', async () => {
    await ensureSchema(db)
    await pastDay(at(1), ['khichdi'])
    await pastDay(at(4), ['chole'])

    const state = await createStore(db, () => TODAY).read()
    // Two days of evidence, not five with three zeroes poisoning the average.
    expect(state.trailingDays).toHaveLength(2)
    expect(state.trailingDays.every(d => d.calories > 0)).toBe(true)
  })

  it('forgets a stale mention of the fridge and keeps a fresh one', async () => {
    await ensureSchema(db)
    await pg.query(
      `insert into pantry_items (item, quantity_signal, raw, first_mentioned_at, last_confirmed_at)
       values ('bhindi', 'a lot', 'lots of bhindi', $1, $1), ('paneer', 'some', 'some paneer', $2, $2)`,
      [new Date(TODAY - 20 * DAY).toISOString(), new Date(TODAY - 1 * DAY).toISOString()]
    )

    const state = await createStore(db, () => TODAY).read()
    expect(state.pantry.map(p => p.item)).toEqual(['paneer'])
    // A day-old belief is worth less than a fresh one, and says so.
    expect(state.pantry[0].confidence).toBeLessThan(1)
    expect(state.pantry[0].confidence).toBeGreaterThan(0.5)
  })
})

describe('the edit log', () => {
  it('records a substitution with the context it happened in', async () => {
    const store = createStore(db, () => TODAY)
    const first = new PlanTurn(await store.read(), TODAY)
    first.addTurn('user', 'something light')
    first.shortlist('dinner')
    first.setPlan('dinner', ['khichdi'])
    await store.write(first.current)

    const second = new PlanTurn(await store.read(), TODAY)
    second.addTurn('user', 'not khichdi, something else')
    second.shortlist('dinner')
    second.setPlan('dinner', ['chole'])
    await store.write(second.current)

    const { rows } = await pg.query<{ kind: string; from_dish_id: string; to_dish_id: string; raw: string }>(
      `select kind, from_dish_id, to_dish_id, raw from edit_events`
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: 'substitution',
      from_dish_id: 'khichdi',
      to_dish_id: 'chole',
      raw: 'not khichdi, something else',
    })
  })

  it('keeps the log when today is started over', async () => {
    const store = createStore(db, () => TODAY)
    const turn = new PlanTurn(await store.read(), TODAY)
    turn.addTurn('user', 'no onions')
    turn.stateConstraint({ dimension: 'ingredient', value: '-onion', raw: 'no onions', strength: 'preference' })
    await store.write(turn.current)

    await store.reset()
    const { rows } = await pg.query(`select 1 from edit_events`)
    // A button on a screen is not a reason to delete something that was said.
    expect(rows).toHaveLength(1)
  })
})

describe('associations', () => {
  it('seeds the library assumptions on first boot and does not duplicate them', async () => {
    const store = createStore(db, () => TODAY)
    await store.read()
    const first = await pg.query(`select count(*)::int as n from associations`)
    await store.write(await store.read())
    const second = await pg.query(`select count(*)::int as n from associations`)
    expect((first.rows[0] as { n: number }).n).toBeGreaterThan(0)
    expect(second.rows[0]).toEqual(first.rows[0])
  })

  it('does not overwrite one the household has corrected', async () => {
    const store = createStore(db, () => TODAY)
    const state = await store.read()
    await pg.query(
      `update associations set source = 'stated', objects = array['curd'] where id = 'rice-needs-wet'`
    )
    await store.write(state)
    const { rows } = await pg.query<{ objects: string[] }>(
      `select objects from associations where id = 'rice-needs-wet'`
    )
    expect(rows[0].objects).toEqual(['curd'])
  })
})

describe('nothing leaks the credential', () => {
  it('scrubs a connection string out of any message', () => {
    const leaked = 'connect failed: postgresql://ankur:hunter2@ep-x.eu-west-2.aws.neon.tech/rasoi'
    const safe = redact(leaked)
    expect(safe).not.toContain('hunter2')
    expect(safe).not.toContain('ankur:')
    expect(safe).toContain('<redacted>@')
  })
})

describe('the stub path, end to end, against Postgres', () => {
  // Exactly what the route does on each turn — read, take a turn, write — with
  // the real store underneath. The HTTP shell around it is not exercised here;
  // its failure path is, below.
  async function turn(store: ReturnType<typeof createStore>, text: string, now: number) {
    const state = await store.read()
    const outcome = await converseStubbed(state, text, () => {}, now)
    await store.write(outcome.state)
    return outcome
  }

  it('holds a conversation, then becomes history the next day', async () => {
    let clock = TODAY - DAY
    const store = createStore(db, () => clock)

    // Day one. Nothing is known, so nothing is claimed.
    const opening = await store.read()
    expect(opening.trailingDays).toEqual([])

    await turn(store, 'something light for dinner', clock)
    const planned = await turn(store, 'just dinner', clock)
    const dinner = planned.state.slots.find(s => s.slot === 'dinner')!
    expect(dinner.items.length).toBeGreaterThan(0)

    // It survives the process, not just the request.
    const reread = await createStore(db, () => clock).read()
    expect(reread.slots.find(s => s.slot === 'dinner')!.items.map(i => i.dishId)).toEqual(
      dinner.items.map(i => i.dishId)
    )

    // Day two: yesterday is now something the domain model can read.
    clock = TODAY
    const today = await store.read()
    expect(today.slots.every(s => s.items.length === 0)).toBe(true)
    expect(today.turns).toHaveLength(1)
    expect(today.trailingDays).toHaveLength(1)
    for (const item of dinner.items) {
      expect(today.lastServedAt[item.dishId]).toBe(Date.parse(`${at(1)}T00:00:00Z`))
    }
  })

  it('carries a mention of the fridge into the next day, worth less', async () => {
    let clock = TODAY - 2 * DAY
    const store = createStore(db, () => clock)
    await turn(store, "there's a lot of bhindi lying around", clock)
    expect((await store.read()).pantry.map(p => p.item)).toEqual(['bhindi'])

    clock = TODAY
    const later = await store.read()
    expect(later.pantry.map(p => p.item)).toEqual(['bhindi'])
    expect(later.pantry[0].confidence).toBeLessThan(0.8)
  })
})

describe('when there is nowhere to keep anything', () => {
  it('answers with a sentence naming the variable, not a stack trace', async () => {
    const saved = process.env.DATABASE_URL
    const savedDirect = process.env.DATABASE_URL_UNPOOLED
    delete process.env.DATABASE_URL
    delete process.env.DATABASE_URL_UNPOOLED
    try {
      const { GET } = await import('../../app/api/plan/route')
      const response = await GET()
      expect(response.status).toBe(503)
      const body = (await response.json()) as { error: string }
      expect(body.error).toContain('DATABASE_URL')
      expect(body.error).toContain('Environment Variables')
      expect(body.error).not.toMatch(/at [A-Za-z]+ \(|\.ts:\d+/)
    } finally {
      if (saved) process.env.DATABASE_URL = saved
      if (savedDirect) process.env.DATABASE_URL_UNPOOLED = savedDirect
    }
  })
})

describe('a day is a day in the kitchen', () => {
  it('files half past midnight in Dubai under that morning, not the day before', () => {
    // 21:30 UTC is 01:30 the next day in Dubai. Bucketing history by UTC would
    // put a late dinner on yesterday and read the rotation clock a day short.
    const lateEvening = Date.parse('2026-09-10T21:30:00Z')
    expect(isoDate(lateEvening)).toBe('2026-09-11')
  })
})
