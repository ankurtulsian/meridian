import { Dish, Diner, Nutrition, PantryItem, ValidationFinding, ValidationResult } from './types'
import { onHandSet, passesGates, shoppingCost } from './scoring'

// Runs over the finished menu, deterministically, separate from whatever produced
// it. A generator that certifies its own output is the most common way these
// systems quietly lie to you.
//
// Nothing here fixes anything. Findings surface on the card with a one-tap remedy
// where there's an obvious one, because a menu that was silently swapped behind
// your back is a menu you start second-guessing — and once you're second-guessing
// it, you're back to planning by hand.

const DAY_MS = 86_400_000
const REPEAT_WINDOW_DAYS = 5
const HEAVY_FACETS = ['fried', 'heavy', 'rich', 'cheat-meal']
const LOW_PROTEIN_RUN = 3

export interface NutritionTargets {
  dailyCalories: number
  dailyProteinG: number
}

export interface ValidationContext {
  eating: Diner[]
  pantry: PantryItem[]
  staples: Set<string>
  lastServedAt: Record<string, number | null>
  // Per-day totals for the trailing week, oldest first, today excluded. Macros are
  // tracked across days rather than per meal: nobody hits their targets at lunch,
  // and a per-meal check just cries wolf until it gets ignored.
  trailingDays: Nutrition[]
  targets: NutritionTargets
  now: number
}

export function validate(dishes: Dish[], ctx: ValidationContext): ValidationResult {
  const blocks: ValidationFinding[] = []
  const warnings: ValidationFinding[] = []

  for (const dish of dishes) {
    if (!passesGates(dish, ctx.eating)) {
      blocks.push({
        code: 'gate',
        dishId: dish.id,
        message: `${dish.nameEn} doesn't work for someone eating tonight.`,
        suggestion: 'Swap it, or add a fork so a portion comes out before the masala.',
      })
    }
  }

  // Everyone needs something on the table they'd actually eat. For a flexible
  // diner that's a nudge; for an inflexible one it's the difference between
  // dinner and a second dinner at 9pm.
  for (const diner of ctx.eating) {
    const edible = dishes.filter(
      d => passesGates(d, [diner]) || d.fork?.forDiner === diner.id
    )
    if (edible.length) continue

    const finding: ValidationFinding = {
      code: 'nothing-for-diner',
      message: `Nothing here works for ${diner.name}.`,
      suggestion: 'Add a dish that forks, or swap the main.',
    }
    if (diner.flexibility < 0.5) blocks.push(finding)
    else warnings.push(finding)
  }

  for (const dish of dishes) {
    const last = ctx.lastServedAt[dish.id]
    if (last === null || last === undefined) continue
    const days = Math.floor((ctx.now - last) / DAY_MS)
    if (days <= REPEAT_WINDOW_DAYS) {
      warnings.push({
        code: 'repeat',
        dishId: dish.id,
        message:
          days === 0
            ? `${dish.nameEn} was on today's menu already.`
            : `${dish.nameEn} was made ${days} day${days === 1 ? '' : 's'} ago.`,
        suggestion: 'Keep it if it went down well — otherwise reroll this one.',
      })
    }
  }

  const heavy = dishes.filter(d => d.facets.some(f => HEAVY_FACETS.includes(f)))
  if (heavy.length > 1) {
    const names = heavy.map(d => d.nameEn).join(' and ')
    warnings.push({
      code: 'coherence',
      message: `That's two rich dishes — ${names}.`,
      suggestion: 'Want me to lighten one?',
    })
  }

  const todayProtein = dishes.reduce((sum, d) => sum + d.nutrition.proteinG, 0)
  const recent = [...ctx.trailingDays.map(d => d.proteinG), todayProtein]
  const run = recent.slice(-LOW_PROTEIN_RUN)
  if (run.length === LOW_PROTEIN_RUN && run.every(p => p < ctx.targets.dailyProteinG)) {
    warnings.push({
      code: 'protein-run',
      message: `Protein has been under target ${LOW_PROTEIN_RUN} days running.`,
      suggestion: 'A dal, paneer or egg dish would close the gap.',
    })
  }

  const onHand = onHandSet(ctx.staples, ctx.pantry)
  const shoppingList = Array.from(
    new Set(
      dishes.flatMap(d =>
        d.ingredients
          .filter(i => !i.optional && !onHand.has(i.item.toLowerCase()))
          .map(i => i.item)
      )
    )
  )

  // A store run is a cost, never a blocker — but a menu where most of it needs
  // buying is worth saying out loud before it gets sent to the kitchen.
  const avgCost =
    dishes.reduce((sum, d) => sum + shoppingCost(d, onHand), 0) / Math.max(dishes.length, 1)
  if (avgCost > 0.5) {
    warnings.push({
      code: 'shopping-heavy',
      message: `Most of this needs buying — ${shoppingList.length} items.`,
      suggestion: 'Fine if someone is going out anyway.',
    })
  }

  return { blocks, warnings, shoppingList }
}
