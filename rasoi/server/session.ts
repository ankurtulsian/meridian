import { Association } from '../lib/associations'
import { emptyRequest } from '../lib/request'
import { DinerId, EditEvent, MealSlot, MenuItem, Nutrition, PantryItem, PlateOutcome } from '../lib/types'
import { RequestState } from '../lib/request'
import { SLOT_ORDER, Stage, Turn } from '../lib/view'

export type { Turn }

export interface StoredSlot {
  slot: MealSlot
  source: 'planned' | 'given'
  items: MenuItem[]
}

export interface AppState {
  date: string
  eating: DinerId[]
  turns: Turn[]
  request: RequestState
  slots: StoredSlot[]
  stage: Stage
  // Carried across days now, with the age of the belief attached. What is not
  // here has aged out rather than been deleted.
  pantry: PantryItem[]
  // How it went down, as opposed to what was planned. Still empty in practice —
  // nothing asks — but it is read history now rather than an empty literal.
  outcomes: PlateOutcome[]
  // Derived, not stored: the last day each dish was actually on a plan, and the
  // macro totals of the days behind today. Both come out of the plan history.
  lastServedAt: Record<string, number | null>
  trailingDays: Nutrition[]
  associations: Association[]
  // Write-only for now. Every tweak is logged from today so that the day rules
  // are fitted to real behaviour there is behaviour to fit them to; nothing reads
  // it back yet, so `read` returns it empty.
  edits: EditEvent[]
}

export function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10)
}

// A day nobody has said anything about yet.
//
// There is no history here and none is invented. On the very first run every
// backward-looking reading is empty, and each of them already knows how to say
// so: the flavour line reports that there is not enough history to compare
// against, the repeat checks stay quiet because nothing has been made before, and
// the protein run needs three days it does not have. That is a worse screen than
// the fabricated fortnight it replaces, and it is the true one.
export function emptyDay(date: string, eating: DinerId[] = ['ankur', 'shruti', 'krishna']): AppState {
  return {
    date,
    eating,
    turns: [
      { role: 'assistant', text: 'Anything particular in mind, or shall I suggest something?' },
    ],
    request: emptyRequest(),
    slots: SLOT_ORDER.map(slot => ({ slot, source: 'planned' as const, items: [] })),
    stage: 'open',
    pantry: [],
    outcomes: [],
    lastServedAt: {},
    trailingDays: [],
    associations: [],
    edits: [],
  }
}
