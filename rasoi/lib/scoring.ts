import { Dish, Diner, Facet, PantryItem, PlateOutcome } from './types'

// Ranking, not constraint solving.
//
// Ingredients can always be bought, so needing a store run makes a menu expensive
// rather than invalid. Reserving gates for the handful of genuinely
// non-negotiable things keeps 'no valid menu found' — the failure that kills
// constraint-solver meal planners — permanently off the table. There is always an
// answer; the tradeoffs show on the card.

export const WEIGHTS = {
  useFirst: 3.0,
  shoppingCost: -1.2,
  intentMatch: 2.5,
  recency: -2.0,
  preference: 1.5,
  effort: -0.4,
}

const DAY_MS = 86_400_000
const RECENCY_WINDOW_DAYS = 14
const PREFERENCE_HALF_LIFE_DAYS = 90

const QUANTITY_WEIGHT = { 'a little': 0.4, some: 0.7, 'a lot': 1 } as const
const OUTCOME_VALUE = { ate: 1, 'ate-around-it': -0.3, refused: -1 } as const

export interface ScoringContext {
  eating: Diner[]
  pantry: PantryItem[]
  // Things assumed to be in the house always — atta, dal, rice, onions, oil,
  // spices. The pantry only ever holds what needs using up, so without this every
  // dish would look like it needed a shopping trip.
  staples: Set<string>
  outcomes: PlateOutcome[]
  // Keyed by dish id. Null means never served.
  lastServedAt: Record<string, number | null>
  intent: Record<Facet, number>
  now: number
}

function dishContains(dish: Dish, item: string): boolean {
  const needle = item.toLowerCase()
  return dish.ingredients.some(i => i.item.toLowerCase().includes(needle))
}

// The only genuine blocks: allergies, and things a diner truly will not eat.
export function passesGates(dish: Dish, eating: Diner[]): boolean {
  return eating.every(diner => {
    if (diner.allergies.some(a => dishContains(dish, a))) return false
    if (diner.willNotEat.some(x => dishContains(dish, x))) {
      // A dish someone won't touch still works if it forks into one they will —
      // which is the whole point of cooking one meal instead of two.
      return dish.fork?.forDiner === diner.id
    }
    return true
  })
}

// Aging ingredients tilt the menu; they never dictate it. Confidence is folded in
// so a stale belief about the fridge pulls less weight than a fresh one.
export function useFirstBonus(dish: Dish, pantry: PantryItem[]): number {
  let score = 0
  for (const item of pantry) {
    if (dishContains(dish, item.item)) {
      score += QUANTITY_WEIGHT[item.quantitySignal] * item.confidence
    }
  }
  return Math.min(score, 2)
}

export function onHandSet(staples: Set<string>, pantry: PantryItem[]): Set<string> {
  return new Set([...staples, ...pantry.map(p => p.item.toLowerCase())])
}

// Fraction of the dish that would need buying. A cost, deliberately not a filter.
export function shoppingCost(dish: Dish, onHand: Set<string>): number {
  const required = dish.ingredients.filter(i => !i.optional)
  if (!required.length) return 0
  const missing = required.filter(i => !onHand.has(i.item.toLowerCase()))
  return missing.length / required.length
}

// A decaying penalty rather than a cutoff — and it counts what was *planned*
// unless we know better, so confirming that a dish never actually got cooked
// releases it immediately instead of suppressing it for another fortnight.
export function recencyPenalty(lastServedAt: number | null, now: number): number {
  if (lastServedAt === null) return 0
  const days = (now - lastServedAt) / DAY_MS
  return Math.max(0, 1 - days / RECENCY_WINDOW_DAYS)
}

// Negative signal decays. A dish refused in March should come round again in
// August — a child's preferences turn over fast, and permanently blacklisting on
// one bad night slowly starves the variety this system exists to produce.
export function preferenceScore(dish: Dish, ctx: ScoringContext): number {
  let total = 0
  for (const diner of ctx.eating) {
    const theirs = ctx.outcomes.filter(o => o.dishId === dish.id && o.diner === diner.id)
    if (!theirs.length) continue

    let signal = 0
    let weight = 0
    for (const outcome of theirs) {
      const decay = Math.pow(
        0.5,
        (ctx.now - outcome.at) / DAY_MS / PREFERENCE_HALF_LIFE_DAYS
      )
      signal += OUTCOME_VALUE[outcome.result] * decay
      weight += decay
    }
    // The less flexible diner moves the score more. Ankur bending easily is a
    // fact about Ankur, not a reason to stop cooking what Ankur likes.
    total += (signal / Math.max(weight, 1e-6)) * (1 - diner.flexibility)
  }
  return total
}

export function intentMatch(dish: Dish, intent: Record<Facet, number>): number {
  const asked = Object.keys(intent)
  if (!asked.length) return 0
  const hit = dish.facets.reduce((sum, f) => sum + (intent[f] || 0), 0)
  const possible = asked.reduce((sum, f) => sum + intent[f], 0)
  return hit / possible
}

export interface DishScore {
  dishId: string
  score: number
  // The breakdown travels with the score. A ranking you can't interrogate is one
  // you stop trusting the first time it surprises you.
  terms: Record<string, number>
}

export function scoreDish(dish: Dish, ctx: ScoringContext): DishScore {
  const terms = {
    useFirst: WEIGHTS.useFirst * useFirstBonus(dish, ctx.pantry),
    shoppingCost: WEIGHTS.shoppingCost * shoppingCost(dish, onHandSet(ctx.staples, ctx.pantry)),
    intentMatch: WEIGHTS.intentMatch * intentMatch(dish, ctx.intent),
    recency: WEIGHTS.recency * recencyPenalty(ctx.lastServedAt[dish.id] ?? null, ctx.now),
    preference: WEIGHTS.preference * preferenceScore(dish, ctx),
    effort: WEIGHTS.effort * (dish.effort - 1),
  }
  const score = Object.values(terms).reduce((a, b) => a + b, 0)
  return { dishId: dish.id, score, terms }
}

export function rank(dishes: Dish[], ctx: ScoringContext): DishScore[] {
  return dishes
    .filter(d => d.status !== 'retired' && passesGates(d, ctx.eating))
    .map(d => scoreDish(d, ctx))
    .sort((a, b) => b.score - a.score)
}
