import { Dish, Diner, MealSlot, Nutrition, PantryItem, ValidationFinding, ValidationResult } from './types'
import { onHandSet, passesGates, shoppingCost } from './scoring'

// Runs over the finished day, deterministically, separate from whatever produced
// it. A generator that certifies its own output is the most common way these
// systems quietly lie to you.
//
// The unit is the day, not the meal. A rich lunch is only a problem next to a
// rich dinner, and a daily protein target means nothing measured against one
// sitting. Slots that arrived already decided still count — they constrain the
// rest of the day exactly as planned ones do.
//
// Nothing here fixes anything. Findings surface with a one-tap remedy where
// there's an obvious one, because a menu silently swapped behind your back is a
// menu you start second-guessing — and once you're second-guessing it, you're
// back to planning by hand.

const DAY_MS = 86_400_000
const REPEAT_WINDOW_DAYS = 5
const HEAVY_FACETS = ['fried', 'heavy', 'rich', 'cheat-meal']
const LIGHT_FACETS = ['light', 'easy-to-digest']
const LOW_PROTEIN_RUN = 3

export interface NutritionTargets {
  dailyCalories: number
  dailyProteinG: number
}

export interface DaySlot {
  slot: MealSlot
  dishes: Dish[]
  // Slots we didn't plan still shape the day — they just can't be fixed by us.
  given?: boolean
}

export interface ValidationContext {
  eating: Diner[]
  pantry: PantryItem[]
  staples: Set<string>
  lastServedAt: Record<string, number | null>
  // Per-day totals for the trailing week, oldest first, today excluded. Macros
  // are tracked across days: nobody hits their targets at lunch, and a per-meal
  // check just cries wolf until it gets ignored.
  trailingDays: Nutrition[]
  targets: NutritionTargets
  now: number
}

const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner']

function isHeavy(dish: Dish): boolean {
  return dish.facets.some(f => HEAVY_FACETS.includes(f))
}

function slotLabel(slot: MealSlot): string {
  return slot === 'snacks' ? 'snacks' : slot
}

export function validateDay(slots: DaySlot[], ctx: ValidationContext): ValidationResult {
  const blocks: ValidationFinding[] = []
  const warnings: ValidationFinding[] = []

  const ordered = [...slots].sort(
    (a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot)
  )
  const planned = ordered.filter(s => !s.given)
  const allDishes = ordered.flatMap(s => s.dishes)

  // Gates only apply to what we chose. A slot that arrived already decided is
  // information, not something to complain about.
  for (const { slot, dishes } of planned) {
    for (const dish of dishes) {
      if (!passesGates(dish, ctx.eating)) {
        blocks.push({
          code: 'gate',
          dishId: dish.id,
          message: `${dish.nameEn} at ${slotLabel(slot)} doesn't work for someone eating.`,
          suggestion: 'Swap it, or add a fork so a portion comes out before the masala.',
        })
      }
    }
  }

  // Everyone needs something they'd actually eat, at every slot they're present
  // for. For a flexible diner that's a nudge; for an inflexible one it's the
  // difference between dinner and a second dinner at nine.
  for (const { slot, dishes } of planned) {
    if (!dishes.length) continue
    for (const diner of ctx.eating) {
      const edible = dishes.filter(d => passesGates(d, [diner]) || d.fork?.forDiner === diner.id)
      if (edible.length) continue

      const finding: ValidationFinding = {
        code: 'nothing-for-diner',
        message: `Nothing at ${slotLabel(slot)} works for ${diner.name}.`,
        suggestion: 'Add a dish that forks, or swap the main.',
      }
      if (diner.flexibility < 0.5) blocks.push(finding)
      else warnings.push(finding)
    }
  }

  const seenToday = new Map<string, MealSlot>()
  for (const { slot, dishes } of ordered) {
    for (const dish of dishes) {
      const earlier = seenToday.get(dish.id)
      if (earlier) {
        warnings.push({
          code: 'repeat-same-day',
          dishId: dish.id,
          message: `${dish.nameEn} is on twice today — ${slotLabel(earlier)} and ${slotLabel(slot)}.`,
          suggestion: 'Fine as leftovers, otherwise reroll the second one.',
        })
      } else {
        seenToday.set(dish.id, slot)
      }
    }
  }

  for (const dish of planned.flatMap(s => s.dishes)) {
    const last = ctx.lastServedAt[dish.id]
    // Null means never served; undefined means we have no record, which is not
    // the same thing — a day nobody planned through us leaves a real hole, and
    // guessing into it is worse than leaving the dish unpenalised.
    if (last === null || last === undefined) continue
    const days = Math.floor((ctx.now - last) / DAY_MS)
    if (days <= REPEAT_WINDOW_DAYS) {
      warnings.push({
        code: 'repeat',
        dishId: dish.id,
        message: `${dish.nameEn} was made ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`}.`,
        suggestion: 'Keep it if it went down well — otherwise reroll this one.',
      })
    }
  }

  // Lunch sets up dinner. This is the check that only exists because the day is
  // the unit.
  const heavySlots = ordered.filter(s => s.dishes.some(isHeavy))
  if (heavySlots.length > 1) {
    warnings.push({
      code: 'day-balance',
      message: `Rich at ${heavySlots.map(s => slotLabel(s.slot)).join(' and ')}.`,
      suggestion: 'Want me to lighten the later one?',
    })
  }

  const lunch = ordered.find(s => s.slot === 'lunch')
  const dinner = ordered.find(s => s.slot === 'dinner')
  if (
    lunch && dinner &&
    lunch.dishes.some(isHeavy) &&
    !dinner.dishes.some(d => d.facets.some(f => LIGHT_FACETS.includes(f)))
  ) {
    warnings.push({
      code: 'no-light-landing',
      message: 'Heavy lunch with nothing light at dinner.',
      suggestion: 'A dal-khichdi sort of dinner would land better.',
    })
  }

  const todayProtein = allDishes.reduce((sum, d) => sum + d.nutrition.proteinG, 0)
  const recent = [...ctx.trailingDays.map(d => d.proteinG), todayProtein]
  const run = recent.slice(-LOW_PROTEIN_RUN)
  if (run.length === LOW_PROTEIN_RUN && run.every(p => p < ctx.targets.dailyProteinG)) {
    warnings.push({
      code: 'protein-run',
      message: `Protein under target ${LOW_PROTEIN_RUN} days running.`,
      suggestion: 'A dal, paneer or egg dish would close the gap.',
    })
  }

  const onHand = onHandSet(ctx.staples, ctx.pantry)
  const shoppingList = Array.from(
    new Set(
      planned
        .flatMap(s => s.dishes)
        .flatMap(d =>
          d.ingredients.filter(i => !i.optional && !onHand.has(i.item.toLowerCase())).map(i => i.item)
        )
    )
  )

  // A store run is a cost, never a blocker — but a day where most of it needs
  // buying is worth saying out loud before it goes to the kitchen.
  const plannedDishes = planned.flatMap(s => s.dishes)
  const avgCost =
    plannedDishes.reduce((sum, d) => sum + shoppingCost(d, onHand), 0) /
    Math.max(plannedDishes.length, 1)
  if (avgCost > 0.5) {
    warnings.push({
      code: 'shopping-heavy',
      message: `Most of this needs buying — ${shoppingList.length} items.`,
      suggestion: 'Fine if someone is going out anyway.',
    })
  }

  return { blocks, warnings, shoppingList }
}
