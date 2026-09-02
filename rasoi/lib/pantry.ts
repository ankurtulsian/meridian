import { PantryItem } from './types'

// The fridge as a belief with an age on it.
//
// Stock is not a ledger. Nobody tells this system when the bhindi runs out, so a
// mention has to lose force on its own — otherwise by week three the pantry is a
// list of things that were true once, quietly tilting every menu towards food
// nobody has.
//
// The half-life is short on purpose. Ankur's own framing was that the fridge is
// only known when recently mentioned and goes stale in days, so four days is
// where a mention is worth half of what it was, and a fortnight is where it is
// worth nothing and disappears.

const DAY_MS = 86_400_000
const HALF_LIFE_DAYS = 4
// Below this a belief is not worth the arithmetic it would tilt.
const FLOOR = 0.15

export function decayed(item: PantryItem, now: number): PantryItem {
  const days = Math.max(0, (now - item.lastConfirmedAt) / DAY_MS)
  const confidence = Math.pow(0.5, days / HALF_LIFE_DAYS)
  return { ...item, confidence }
}

// Aged out rather than deleted on a schedule: an item stops counting because
// nobody has mentioned it lately, which is the same reason it stopped being true.
export function currentPantry(items: PantryItem[], now: number): PantryItem[] {
  return items.map(i => decayed(i, now)).filter(i => i.confidence >= FLOOR)
}
