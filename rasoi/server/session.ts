import { Association } from '../lib/associations'
import { ASSOCIATIONS, DISH_BY_ID } from '../lib/library'
import { emptyRequest, RequestState } from '../lib/request'
import { DinerId, MealSlot, MenuItem, Nutrition, PantryItem, PlateOutcome } from '../lib/types'
import { Stage, sumNutrition, Turn } from '../lib/view'

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
  pantry: PantryItem[]
  // What was thought of any of it. Empty, and it stays empty until somebody says
  // — the system knows what it planned, which is not the same as knowing how it
  // went down, and guessing the difference is how these things start lying.
  outcomes: PlateOutcome[]
  lastServedAt: Record<string, number | null>
  trailingDays: Nutrition[]
  associations: Association[]
}

const DAY_MS = 86_400_000

function isoDate(t: number): string {
  return new Date(t).toISOString().slice(0, 10)
}

// FABRICATED. A fortnight of plausible history, invented so the arithmetic has
// something to stand on: without it every dish is equally fresh, and the flavour
// line can only say "not enough history yet". It is the one thing in the running
// system that nobody told it. Replace it with the real thing the moment there is
// one — the shape is already right.
function fabricatedHistory(now: number): {
  lastServedAt: Record<string, number | null>
  trailingDays: Nutrition[]
} {
  const daysAgo = (n: number) => now - n * DAY_MS
  // Written as days rather than as numbers, and summed from the library, so the
  // baseline is always a baseline of food this kitchen actually makes. Hand-typed
  // totals drift away from the dishes the moment either one is edited.
  const days: string[][] = [
    ['poha', 'chai', 'chole', 'roti', 'kachumber', 'khichdi', 'curd'],
    ['upma', 'chai', 'rajma-chawal', 'palak-paneer', 'roti'],
    ['besan-chilla', 'chai', 'kadhi-chawal', 'bhindi-masala', 'roti'],
    ['poha', 'chai', 'dal-tadka', 'jeera-rice', 'kachumber', 'curd'],
    ['aloo-paratha', 'chai', 'lauki-chana-dal', 'roti', 'baingan-bharta'],
    ['idli-sambar', 'chai', 'paneer-butter-masala', 'roti', 'veg-pulao'],
  ]

  return {
    lastServedAt: {
      'rajma-chawal': now,
      poha: now,
      chai: now,
      kachumber: now,
      roti: daysAgo(1),
      'dal-tadka': daysAgo(2),
      'bhindi-masala': daysAgo(3),
      'aloo-paratha': daysAgo(4),
      chole: daysAgo(6),
      'kadhi-chawal': daysAgo(8),
      khichdi: daysAgo(9),
      'paneer-butter-masala': daysAgo(11),
      'jeera-rice': daysAgo(2),
      curd: daysAgo(2),
      upma: daysAgo(5),
    },
    trailingDays: days.map(ids =>
      sumNutrition(ids.map(id => DISH_BY_ID[id]).filter(Boolean))
    ),
  }
}

// Breakfast and lunch are behind them — settled elsewhere, not by us, and still
// shaping what dinner should be. That is the whole reason the day is the unit.
export function seedState(now: number = Date.now()): AppState {
  const { lastServedAt, trailingDays } = fabricatedHistory(now)
  return {
    date: isoDate(now),
    eating: ['ankur', 'shruti', 'krishna'],
    turns: [
      {
        role: 'assistant',
        text: 'Anything particular in mind, or shall I suggest something?',
      },
    ],
    request: emptyRequest(),
    slots: [
      {
        slot: 'breakfast',
        source: 'given',
        items: [
          { dishId: 'poha', pinned: true, outcome: 'cooked' },
          { dishId: 'chai', pinned: true, outcome: 'cooked' },
        ],
      },
      {
        slot: 'lunch',
        source: 'given',
        items: [
          { dishId: 'rajma-chawal', pinned: true, outcome: 'cooked' },
          { dishId: 'kachumber', pinned: true, outcome: 'cooked' },
        ],
      },
      { slot: 'snacks', source: 'planned', items: [] },
      { slot: 'dinner', source: 'planned', items: [] },
    ],
    stage: 'open',
    // The fridge is only ever what he says it is. Nothing infers it, so it starts
    // empty and stays empty until he mentions something.
    pantry: [],
    outcomes: [],
    lastServedAt,
    trailingDays,
    associations: ASSOCIATIONS,
  }
}

export function isStale(state: AppState, now: number = Date.now()): boolean {
  return state.date !== isoDate(now)
}
