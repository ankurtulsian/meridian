import { Association } from '../lib/associations'
import { ASSOCIATIONS, DISH_BY_ID } from '../lib/library'
import { currentPantry } from '../lib/pantry'
import { MealSlot, MenuItem, Nutrition, PantryItem, PlateOutcome, StandingNote } from '../lib/types'
import { ZONE } from '../lib/seed'
import { SLOT_ORDER, sumNutrition } from '../lib/view'
import { Db, ensureSchema, neonDb, Row, Statement } from './db'
import { AppState, emptyDay, isoDate, StoredSlot } from './session'

// The whole of persistence, still behind three functions.
//
// What changed underneath is not the storage engine but the fact that there is
// now a past at all. The file version held exactly one state and threw it away at
// midnight, which meant every backward-looking reading in the domain model —
// rotation, the macro baseline, preference decay — was being fed a fortnight of
// invention. Those readings are the entire reason this system is worth having, so
// they are now derived from what was actually planned, and on day one they are
// honestly empty.
//
// Two things are computed rather than stored, on purpose:
//
//   lastServedAt   the last day a dish was on a plan, today excluded. Excluded
//                  because otherwise the dish chosen this afternoon reports
//                  itself as having been made today, and the repeat warning
//                  fires on the very thing it just proposed.
//   trailingDays   macro totals per past day, summed from the library at read
//                  time. Storing them would freeze an estimate that is only
//                  accurate to a fifth anyway; correcting a dish should correct
//                  the history it distorted.

const TRAILING_DAYS = 7
// Preference signal halves every ninety days, so beyond about half a year a
// row contributes less than rounding.
const OUTCOME_WINDOW_DAYS = 200

export interface Store {
  read(): Promise<AppState>
  write(state: AppState): Promise<void>
  reset(): Promise<AppState>
}

const ms = (row: Row, key: string): number => Number(row[key])

function slotsFrom(rows: Row[]): StoredSlot[] {
  const bySlot = new Map<MealSlot, StoredSlot>(
    SLOT_ORDER.map(slot => [slot, { slot, source: 'planned' as const, items: [] }])
  )
  for (const row of rows) {
    const slot = String(row.slot) as MealSlot
    const stored = bySlot.get(slot)
    if (!stored) continue
    stored.source = row.source === 'given' ? 'given' : 'planned'
    const dish = DISH_BY_ID[String(row.dish_id)]
    const item: MenuItem = {
      dishId: String(row.dish_id),
      pinned: Boolean(row.pinned),
      fork: dish?.fork,
      outcome: row.outcome as MenuItem['outcome'],
    }
    stored.items.push(item)
  }
  return SLOT_ORDER.map(slot => bySlot.get(slot)!)
}

export function createStore(db: Db, now: () => number = Date.now): Store {
  // Read once per process, not per request. The zone changes when somebody moves
  // house, which is rarer than a cold start by several orders of magnitude, and
  // paying a round trip for it on every turn to catch that would be absurd.
  let zoneMemo: string | null = null

  async function homeZone(): Promise<string> {
    if (zoneMemo) return zoneMemo
    const [rows] = await db.batch([
      { text: `select value from settings where key = 'zone'` },
    ])
    zoneMemo = rows[0] ? String(rows[0].value) : ZONE
    return zoneMemo
  }

  async function load(date: string, zone: string): Promise<AppState> {
    // One source of truth for what an untouched day is, used both to create the
    // row and to fall back on. Seeding the row with the opening line matters:
    // left to the column default the day would exist with no conversation in it,
    // and the screen would open silent instead of asking.
    const fresh = emptyDay(date, undefined, [], zone)
    const [
      ,
      dayRows,
      itemRows,
      servedRows,
      trailingRows,
      pantryRows,
      outcomeRows,
      associationRows,
      noteRows,
    ] = await db.batch([
        {
          text: `insert into days (the_date, eating, turns)
                 values ($1::date, $2::text[], $3::jsonb)
                 on conflict (the_date) do nothing`,
          params: [date, fresh.eating, JSON.stringify(fresh.turns)],
        },
        {
          text: `select eating, stage, request, turns from days where the_date = $1::date`,
          params: [date],
        },
        {
          text: `select slot, dish_id, ordinal, source, pinned, outcome
                 from plan_items where the_date = $1::date order by slot, ordinal`,
          params: [date],
        },
        {
          // Today is excluded: "last served" means before now, or the plan warns
          // about itself.
          text: `select dish_id, (extract(epoch from max(the_date)) * 1000)::float8 as last_ms
                 from plan_items
                 where the_date < $1::date and outcome <> 'skipped'
                 group by dish_id`,
          params: [date],
        },
        {
          // Days with no plan are absent rather than zero. A gap is a day we were
          // not used, not a day nobody ate.
          text: `select array_agg(dish_id) as dish_ids
                 from plan_items
                 where the_date < $1::date and the_date >= ($1::date - $2::int)
                 group by the_date order by the_date asc`,
          params: [date, TRAILING_DAYS],
        },
        {
          text: `select item, quantity_signal, raw,
                        (extract(epoch from first_mentioned_at) * 1000)::float8 as first_ms,
                        (extract(epoch from last_confirmed_at) * 1000)::float8 as last_ms
                 from pantry_items`,
        },
        {
          text: `select id, dish_id, diner, result,
                        (extract(epoch from happened_at) * 1000)::float8 as at_ms
                 from plate_outcomes
                 where happened_at > now() - make_interval(days => $1::int)`,
          params: [OUTCOME_WINDOW_DAYS],
        },
        {
          text: `select id, kind, subject, objects, source, confidence, observed_count,
                        (extract(epoch from updated_at) * 1000)::float8 as updated_ms
                 from associations`,
        },
        {
          // Retired notes are left in the table and filtered out here, so that a
          // dropped instruction is answerable rather than gone.
          text: `select id, kind, note, raw, affirmed_count,
                        (extract(epoch from created_at) * 1000)::float8 as created_ms,
                        (extract(epoch from last_affirmed_at) * 1000)::float8 as affirmed_ms
                 from standing_notes
                 where retired_at is null
                 order by created_at`,
        },
      ])

    const day = dayRows[0]
    if (!day) return fresh

    const raw: PantryItem[] = pantryRows.map(r => ({
      id: String(r.item),
      item: String(r.item),
      quantitySignal: r.quantity_signal as PantryItem['quantitySignal'],
      raw: String(r.raw),
      // Recomputed from how long ago it was said, never read from a stored
      // number that nothing has run to age.
      confidence: 1,
      firstMentionedAt: ms(r, 'first_ms'),
      lastConfirmedAt: ms(r, 'last_ms'),
    }))

    const lastServedAt: Record<string, number | null> = {}
    for (const row of servedRows) lastServedAt[String(row.dish_id)] = ms(row, 'last_ms')

    const trailingDays: Nutrition[] = trailingRows.map(row =>
      sumNutrition((row.dish_ids as string[]).map(id => DISH_BY_ID[id]).filter(Boolean))
    )

    const outcomes: PlateOutcome[] = outcomeRows.map(r => ({
      dishId: String(r.dish_id),
      diner: String(r.diner),
      result: r.result as PlateOutcome['result'],
      at: ms(r, 'at_ms'),
    }))

    const associations: Association[] = associationRows.map(r => ({
      id: String(r.id),
      kind: r.kind as Association['kind'],
      subject: String(r.subject),
      objects: r.objects as string[],
      source: r.source as Association['source'],
      confidence: Number(r.confidence),
      observedCount: Number(r.observed_count),
      updatedAt: ms(r, 'updated_ms'),
    }))

    const notes: StandingNote[] = noteRows.map(r => ({
      id: String(r.id),
      kind: r.kind as StandingNote['kind'],
      text: String(r.note),
      raw: String(r.raw),
      createdAt: ms(r, 'created_ms'),
      lastAffirmedAt: ms(r, 'affirmed_ms'),
      affirmedCount: Number(r.affirmed_count),
    }))

    return {
      ...fresh,
      notes,
      zone,
      eating: (day.eating as string[]) ?? fresh.eating,
      stage: day.stage as AppState['stage'],
      request: day.request as AppState['request'],
      turns: day.turns as AppState['turns'],
      slots: slotsFrom(itemRows),
      pantry: currentPantry(raw, now()),
      outcomes,
      lastServedAt,
      trailingDays,
      associations: associations.length ? associations : ASSOCIATIONS,
      edits: [],
    }
  }

  // Named rather than positional: the first-boot seed reuses exactly this
  // statement, and picking it out of the list by index would break silently the
  // first time the list is reordered.
  function associationUpsert(associations: Association[]): Statement {
    return {
      text: `insert into associations
                 (id, kind, subject, objects, source, confidence, observed_count, updated_at)
               select a.id, a.kind, a.subject, a.objects, a.source, a.confidence,
                      a.observed_count, to_timestamp(a.updated_at / 1000.0)
               from jsonb_to_recordset($1::jsonb)
                 as a(id text, kind text, subject text, objects text[], source text,
                      confidence float8, observed_count int, updated_at float8)
               on conflict (id) do update set
                 objects = excluded.objects,
                 confidence = excluded.confidence,
                 observed_count = excluded.observed_count,
                 updated_at = excluded.updated_at
               where associations.source <> 'stated'`,
        params: [
          JSON.stringify(
            associations.map(a => ({
              id: a.id,
              kind: a.kind,
              subject: a.subject,
              objects: a.objects,
              source: a.source,
              confidence: a.confidence,
              observed_count: a.observedCount,
              updated_at: a.updatedAt,
            }))
          ),
        ],
    }
  }

  function writeStatements(state: AppState): Statement[] {
    const items = state.slots.flatMap(s =>
      s.items.map((item, ordinal) => ({
        slot: s.slot,
        dish_id: item.dishId,
        ordinal,
        source: s.source,
        pinned: item.pinned,
        outcome: item.outcome,
      }))
    )

    return [
      {
        text: `insert into days (the_date, eating, stage, request, turns, updated_at)
               values ($1::date, $2::text[], $3, $4::jsonb, $5::jsonb, now())
               on conflict (the_date) do update set
                 eating = excluded.eating, stage = excluded.stage,
                 request = excluded.request, turns = excluded.turns,
                 updated_at = now()`,
        params: [
          state.date,
          state.eating,
          state.stage,
          JSON.stringify(state.request),
          JSON.stringify(state.turns),
        ],
      },
      // Today's plan is replaced wholesale. Past days are never touched.
      { text: `delete from plan_items where the_date = $1::date`, params: [state.date] },
      {
        text: `insert into plan_items (the_date, slot, dish_id, ordinal, source, pinned, outcome)
               select $1::date, p.slot, p.dish_id, p.ordinal, p.source, p.pinned, p.outcome
               from jsonb_to_recordset($2::jsonb)
                 as p(slot text, dish_id text, ordinal int, source text,
                      pinned boolean, outcome text)`,
        params: [state.date, JSON.stringify(items)],
      },
      // Anything not in the live pantry has aged out of belief, so it goes.
      {
        text: `delete from pantry_items where item <> all($1::text[])`,
        params: [state.pantry.map(p => p.item)],
      },
      {
        text: `insert into pantry_items
                 (item, quantity_signal, raw, first_mentioned_at, last_confirmed_at)
               select p.item, p.quantity_signal, p.raw,
                      to_timestamp(p.first_ms / 1000.0), to_timestamp(p.last_ms / 1000.0)
               from jsonb_to_recordset($1::jsonb)
                 as p(item text, quantity_signal text, raw text,
                      first_ms float8, last_ms float8)
               on conflict (item) do update set
                 quantity_signal = excluded.quantity_signal,
                 raw = excluded.raw,
                 last_confirmed_at = excluded.last_confirmed_at`,
        params: [
          JSON.stringify(
            state.pantry.map(p => ({
              item: p.item,
              quantity_signal: p.quantitySignal,
              raw: p.raw,
              first_ms: p.firstMentionedAt,
              last_ms: p.lastConfirmedAt,
            }))
          ),
        ],
      },
      // Anything dropped this turn is retired rather than deleted, so "you used
      // to tell me X" stays answerable. Retiring by absence keeps the state on
      // the turn as the single description of what is live.
      {
        text: `update standing_notes set retired_at = now()
               where retired_at is null and id <> all($1::text[])`,
        params: [state.notes.map(n => n.id)],
      },
      {
        text: `insert into standing_notes
                 (id, kind, note, raw, created_at, last_affirmed_at, affirmed_count)
               select n.id, n.kind, n.note, n.raw,
                      to_timestamp(n.created_ms / 1000.0),
                      to_timestamp(n.affirmed_ms / 1000.0), n.affirmed_count
               from jsonb_to_recordset($1::jsonb)
                 as n(id text, kind text, note text, raw text, created_ms float8,
                      affirmed_ms float8, affirmed_count int)
               on conflict (id) do update set
                 note = excluded.note,
                 raw = excluded.raw,
                 last_affirmed_at = excluded.last_affirmed_at,
                 affirmed_count = excluded.affirmed_count,
                 retired_at = null`,
        params: [
          JSON.stringify(
            state.notes.map(n => ({
              id: n.id,
              kind: n.kind,
              note: n.text,
              raw: n.raw,
              created_ms: n.createdAt,
              affirmed_ms: n.lastAffirmedAt,
              affirmed_count: n.affirmedCount,
            }))
          ),
        ],
      },
      {
        text: `insert into settings (key, value, updated_at)
               values ('zone', $1::text, now())
               on conflict (key) do update set
                 value = excluded.value, updated_at = now()`,
        params: [state.zone],
      },
      // Append only. An edit is a thing that was said; nothing edits it later.
      {
        text: `insert into edit_events
                 (id, the_date, kind, from_dish_id, to_dish_id, raw, context, author, happened_at)
               select e.id, $1::date, e.kind, e.from_dish_id, e.to_dish_id, e.raw,
                      e.context, e.author, to_timestamp(e.at_ms / 1000.0)
               from jsonb_to_recordset($2::jsonb)
                 as e(id text, kind text, from_dish_id text, to_dish_id text, raw text,
                      context jsonb, author text, at_ms float8)
               on conflict (id) do nothing`,
        params: [
          state.date,
          JSON.stringify(
            state.edits.map(e => ({
              id: e.id,
              kind: e.kind,
              from_dish_id: e.fromDishId ?? null,
              to_dish_id: e.toDishId ?? null,
              raw: e.raw,
              context: e.context,
              author: e.by,
              at_ms: e.at,
            }))
          ),
        ],
      },
      associationUpsert(state.associations),
    ]
  }

  // One writer at a time within a process. Two overlapping requests would
  // otherwise interleave a read-modify-write and lose a turn. Across instances
  // this does nothing — see the note in the report; at one household it has never
  // been the binding constraint.
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T,>(fn: () => Promise<T>): Promise<T> => {
    const next = queue.then(fn, fn)
    queue = next.catch(() => undefined)
    return next
  }

  return {
    read: () =>
      serial(async () => {
        await ensureSchema(db)
        const zone = await homeZone()
        const state = await load(isoDate(now(), zone), zone)
        // First boot: the library's general assumptions become rows so that a
        // correction has something to correct.
        if (!state.associations.length || state.associations === ASSOCIATIONS) {
          await db.batch([associationUpsert(ASSOCIATIONS)])
        }
        return state
      }),

    write: state =>
      serial(async () => {
        await db.batch(writeStatements(state))
        // A turn that moved the kitchen invalidates the value this process has
        // been reusing. Cheaper to drop it than to reason about whether it changed.
        zoneMemo = state.zone
      }),

    // Starts today again. It does not touch the past — a button on a screen is
    // not a reason to delete history, and the edits already logged record things
    // that were genuinely said.
    reset: () =>
      serial(async () => {
        await ensureSchema(db)
        const zone = await homeZone()
        const date = isoDate(now(), zone)
        await db.batch([{ text: `delete from days where the_date = $1::date`, params: [date] }])
        return load(date, zone)
      }),
  }
}

let cached: Store | null = null

function store(): Store {
  if (!cached) cached = createStore(neonDb())
  return cached
}

// The interface the rest of the app sees. Unchanged.
export const read = (): Promise<AppState> => store().read()
export const write = (state: AppState): Promise<void> => store().write(state)
export const reset = (): Promise<AppState> => store().reset()
