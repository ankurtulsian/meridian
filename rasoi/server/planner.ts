import { breaches } from '../lib/associations'
import { buildCard, KitchenCard } from '../lib/card'
import { dayFlavour } from '../lib/flavour'
import { DISHES, DISH_BY_ID } from '../lib/library'
import {
  activeConstraints, applyConstraint, Constraint, effortPressure, ingredientWishes,
  intentWeights, itemOf, varietyPressure,
} from '../lib/request'
import { rank, ScoringContext } from '../lib/scoring'
import { STAPLES } from '../lib/seed'
import { DINERS } from '../lib/seed'
import {
  ConstraintDimension, Dish, DinerId, MealSlot, MenuItem, PantryItem, ValidationResult,
} from '../lib/types'
import { DaySlot, validateDay, ValidationContext } from '../lib/validate'
import {
  DayView, findingViews, openingRemark, RowView, SLOT_LABEL, SLOT_ORDER, SlotView,
  sumNutrition, weekdayOf,
} from '../lib/view'
import { AppState, StoredSlot } from './session'

// The deterministic half of a turn.
//
// Everything the model is allowed to change, it changes through here. Ranking,
// balance, the flavour reading and the conflict between one thing said and
// another are all computed — the model picks from what comes back and puts it
// into words. The split is not stylistic: rotation arithmetic done in a prompt
// drifts, and a planner you cannot trust to remember what it cooked on Tuesday is
// a planner you go back to doing by hand.
//
// The same object serves the real model and the stub, so the stub exercises the
// real machinery and fakes only the language.

// A guard on the context window, not a judgement about quality.
//
// This used to be 12 against a library of 24, which meant the weights were not
// ordering the list — they were deciding that half the kitchen did not exist
// this turn. A weight nobody has fitted to anything should cost presentation
// order at worst; it must never cost availability, least of all silently, when
// the chooser cannot ask for what it was never shown.
//
// So it now sits well clear of the library and exists only so that a library
// which grows past what fits in a prompt degrades gracefully instead of failing.
// If it ever bites, the result says so rather than quietly shortening.
const SHORTLIST_SIZE = 60

// Krishna's own dinners are genuinely not known yet — his food differs from
// theirs and nobody has said how. The second column stays open rather than
// quietly serving him the grown-ups' food.
const UNKNOWN_MENU_FOR: DinerId[] = ['krishna']

const TARGETS = { dailyCalories: 2000, dailyProteinG: 60 }

function dinersOf(ids: DinerId[]) {
  return DINERS.filter(d => ids.includes(d.id))
}

function dishesOf(items: MenuItem[]): Dish[] {
  return items.map(i => DISH_BY_ID[i.dishId]).filter(Boolean)
}

function scoringContext(state: AppState, now: number, slot?: MealSlot): ScoringContext {
  return {
    eating: dinersOf(state.eating),
    pantry: state.pantry,
    staples: STAPLES,
    outcomes: state.outcomes,
    lastServedAt: state.lastServedAt,
    intent: intentWeights(state.request),
    ingredients: ingredientWishes(state.request),
    slot,
    effortPressure: effortPressure(state.request),
    varietyPressure: varietyPressure(state.request),
    now,
  }
}

function validationContext(state: AppState, now: number): ValidationContext {
  return {
    eating: dinersOf(state.eating),
    pantry: state.pantry,
    staples: STAPLES,
    lastServedAt: state.lastServedAt,
    trailingDays: state.trailingDays,
    targets: TARGETS,
    now,
  }
}

function daySlots(state: AppState): DaySlot[] {
  return state.slots.map(s => ({
    slot: s.slot,
    dishes: dishesOf(s.items),
    given: s.source === 'given',
  }))
}

export interface Candidate {
  dishId: string
  nameEn: string
  facets: string[]
  effort: number
  score: number
  // Why it placed where it did, in words. A ranking nobody can interrogate is one
  // they stop trusting the first time it surprises them.
  reasons: string[]
}

const DAY_MS = 86_400_000

function dishContains(dish: Dish, item: string): boolean {
  return dish.ingredients.some(i => i.item.toLowerCase().includes(item.toLowerCase()))
}

function reasonsFor(
  dish: Dish,
  terms: Record<string, number>,
  state: AppState,
  now: number
): string[] {
  // Reasons for first, reservations after. Whoever reads this list reads it in
  // order, and a candidate introduced by its worst property is a candidate
  // being argued against.
  const forIt: string[] = []
  const against: string[] = []

  const used = state.pantry
    .filter(p => dish.ingredients.some(i => i.item.toLowerCase().includes(p.item.toLowerCase())))
    .map(p => p.item)
  if (used.length) forIt.push(`uses up the ${used.join(' and ')}`)

  const asked = intentWeights(state.request)
  const matched = dish.facets.filter(f => asked[f])
  if (matched.length) forIt.push(`matches ${matched.join(', ')}`)

  const wishes = ingredientWishes(state.request)
  const wanted = Object.keys(wishes).filter(i => wishes[i] > 0 && dishContains(dish, i))
  if (wanted.length) forIt.push(`has the ${wanted.join(' and ')}`)

  if (terms.shoppingCost === 0) forIt.push('nothing to buy')
  else if (terms.shoppingCost > -0.6) forIt.push('a couple of things to buy')
  if (dish.effort <= 1) forIt.push('quick')

  const last = state.lastServedAt[dish.id]
  if (typeof last === 'number' && terms.recency < -0.05) {
    const days = Math.floor((now - last) / DAY_MS)
    against.push(days === 0 ? 'made today' : `made ${days} day${days === 1 ? '' : 's'} ago`)
  }
  const unwanted = Object.keys(wishes).filter(i => wishes[i] < 0 && dishContains(dish, i))
  if (unwanted.length) against.push(`has ${unwanted.join(' and ')} in it`)

  if (terms.shoppingCost < -0.6) against.push('most of it needs buying')
  if (dish.effort >= 4) against.push('needs a free afternoon')
  if (terms.slotFit < 0) against.push('more of a morning thing')

  // An empty list reads as a dish nobody can account for. There is always
  // something true to say, even if it is only that nothing is wrong with it.
  if (!forIt.length && !against.length) return ['nothing against it']
  return [...forIt, ...against]
}

export interface ConstraintInput {
  dimension: ConstraintDimension
  value: string
  raw: string
  strength: 'gate' | 'preference'
}

export interface TurnOutcome {
  state: AppState
  view: DayView
  card: KitchenCard | null
}

let constraintSeq = 0

// One turn's worth of mutation, with the guards on it.
export class PlanTurn {
  private state: AppState
  private now: number
  // Only dishes the ranker has actually put in front of the model this turn can
  // be planned. This is the guard that stops the model naming a dish because it
  // sounds right — the choice is its own, but the shortlist is not.
  private offered = new Set<string>()
  private before: Set<string>

  constructor(state: AppState, now: number = Date.now()) {
    this.state = structuredClone(state)
    this.now = now
    this.before = new Set(this.state.slots.flatMap(s => s.items.map(i => i.dishId)))
    // Whatever was highlighted last turn stops being new.
    this.state.slots = this.state.slots.map(s => ({ ...s }))
  }

  get current(): AppState {
    return this.state
  }

  addTurn(role: 'user' | 'assistant', text: string): void {
    this.state.turns = [...this.state.turns, { role, text }]
  }

  // --- tools -------------------------------------------------------------

  stateConstraint(input: ConstraintInput): { ok: true; conflict?: string; active: string[] } {
    const constraint: Constraint = {
      id: `c${++constraintSeq}-${this.now}`,
      dimension: input.dimension,
      value: input.value,
      raw: input.raw,
      strength: input.strength,
      statedAt: this.now,
      active: true,
    }
    const { state, conflict } = applyConstraint(this.state.request, constraint)
    this.state.request = state
    return {
      ok: true,
      conflict: conflict?.note,
      active: activeConstraints(state).map(
        c => `${c.dimension}: ${c.value.startsWith('-') ? `no ${itemOf(c.value)}` : c.value}`
      ),
    }
  }

  notePantry(input: {
    item: string
    quantitySignal: PantryItem['quantitySignal']
    raw: string
  }): { ok: true; pantry: string[] } {
    const existing = this.state.pantry.find(p => p.item.toLowerCase() === input.item.toLowerCase())
    if (existing) {
      existing.quantitySignal = input.quantitySignal
      existing.raw = input.raw
      existing.confidence = 1
      existing.lastConfirmedAt = this.now
    } else {
      this.state.pantry.push({
        id: `p${this.state.pantry.length + 1}-${this.now}`,
        item: input.item,
        quantitySignal: input.quantitySignal,
        raw: input.raw,
        confidence: 1,
        firstMentionedAt: this.now,
        lastConfirmedAt: this.now,
      })
    }
    return { ok: true, pantry: this.state.pantry.map(p => `${p.item} (${p.quantitySignal})`) }
  }

  // `satisfying` narrows the field to dishes that would answer a particular gap —
  // a carb beside a dal, something wet beside rice. Without it the plain staples
  // are systematically invisible: roti matches no mood and is cooked constantly,
  // so the ranker buries the very things that finish a meal.
  shortlist(
    slot: MealSlot,
    satisfying?: string[]
  ): { slot: MealSlot; candidates: Candidate[]; truncated?: number } {
    const already = new Set(
      this.state.slots.find(s => s.slot === slot)?.items.map(i => i.dishId) ?? []
    )
    const field = satisfying?.length
      ? DISHES.filter(d =>
          satisfying.some(
            o =>
              d.id.includes(o) ||
              d.nameEn.toLowerCase().includes(o) ||
              d.ingredients.some(i => i.item.toLowerCase().includes(o))
          )
        )
      : DISHES
    const eligible = rank(field, scoringContext(this.state, this.now, slot)).filter(
      s => !already.has(s.dishId)
    )
    const scored = eligible.slice(0, SHORTLIST_SIZE)

    const candidates = scored.map(s => {
      const dish = DISH_BY_ID[s.dishId]
      this.offered.add(dish.id)
      return {
        dishId: dish.id,
        nameEn: dish.nameEn,
        // No Hindi name here. Every one of them is already in the dish library at
        // the top of the prompt, which is cached and paid for once; repeating it
        // per candidate per turn is the most expensive text in the payload and
        // nothing reads it.
        facets: dish.facets,
        effort: dish.effort,
        score: Math.round(s.score * 100) / 100,
        reasons: reasonsFor(dish, s.terms, this.state, this.now),
      }
    })
    // Anything already on the plan stays choosable, so a slot can be rebuilt
    // without dropping what was kept.
    already.forEach(id => this.offered.add(id))
    return eligible.length > scored.length
      ? { slot, candidates, truncated: eligible.length - scored.length }
      : { slot, candidates }
  }

  setPlan(
    slot: MealSlot,
    dishIds: string[]
  ):
    | { ok: false; error: string }
    | {
        ok: true
        remark: string
        findings: string[]
        shoppingList: string[]
        // The objects travel with the prompt so whatever is reading this can offer a
        // fix rather than only name the gap.
        breaches: { prompt: string; objects: string[] }[]
      } {
    const unknown = dishIds.filter(id => !DISH_BY_ID[id])
    if (unknown.length) {
      return { ok: false, error: `No such dish: ${unknown.join(', ')}. Use shortlist first and pick from what it returns.` }
    }
    const unoffered = dishIds.filter(id => !this.offered.has(id))
    if (unoffered.length) {
      return {
        ok: false,
        error: `${unoffered.join(', ')} was not on the shortlist for this turn. Call shortlist for ${slot} and choose from what comes back.`,
      }
    }

    const target = this.state.slots.find(s => s.slot === slot)
    const kept = target?.items.filter(i => i.pinned && dishIds.includes(i.dishId)) ?? []
    const items: MenuItem[] = dishIds.map(dishId => {
      const existing = kept.find(k => k.dishId === dishId)
      if (existing) return existing
      const dish = DISH_BY_ID[dishId]
      return {
        dishId,
        pinned: false,
        fork: dish.fork,
        outcome: 'proposed' as const,
      }
    })

    if (target) {
      target.items = items
      target.source = 'planned'
    } else {
      this.state.slots.push({ slot, source: 'planned', items })
    }
    // A plan that changed after agreement is no longer an agreed plan.
    if (this.state.stage !== 'open') this.state.stage = 'open'

    const validation = validateDay(daySlots(this.state), validationContext(this.state, this.now))
    const { remark } = this.remark(validation)
    // Beside, not somewhere else today. Run across the whole day, a bowl of rice
    // at lunch quietly answers a dal at dinner and the check never fires — which
    // is exactly how a single dish came to be proposed as a whole dinner.
    const breached = breaches(items.map(i => DISH_BY_ID[i.dishId]).filter(Boolean), this.state.associations)

    return {
      ok: true,
      remark,
      findings: [...validation.blocks, ...validation.warnings].map(f =>
        f.suggestion ? `${f.message} ${f.suggestion}` : f.message
      ),
      shoppingList: validation.shoppingList,
      breaches: breached.map(b => ({ prompt: b.prompt, objects: b.association.objects })),
    }
  }

  // Nothing is settled until he says so out loud, and the system has to have
  // asked. 'confirmed' out of nowhere is refused, which is what keeps a loose
  // "that's fine" from being read as agreement to send.
  setStage(stage: 'converged' | 'confirmed'): { ok: boolean; error?: string; stage: string } {
    if (stage === 'confirmed' && this.state.stage !== 'converged') {
      return {
        ok: false,
        error: 'Ask whether to send it first, and only mark it confirmed once they have answered.',
        stage: this.state.stage,
      }
    }
    const planned = this.state.slots.some(s => s.source === 'planned' && s.items.length)
    if (!planned) {
      return { ok: false, error: 'Nothing has been planned yet.', stage: this.state.stage }
    }
    this.state.stage = stage
    return { ok: true, stage }
  }

  // --- readout -----------------------------------------------------------

  private remark(validation: ValidationResult): { remark: string; streaks: string[] } {
    const plannedWithItems = this.state.slots.filter(
      s => s.source === 'planned' && s.items.length
    )
    if (!plannedWithItems.length) {
      const settled = this.state.slots
        .filter(s => s.source === 'given')
        .map(s => ({ slot: s.slot, dishes: dishesOf(s.items) }))
      return { remark: openingRemark(settled), streaks: [] }
    }
    const today = sumNutrition(this.state.slots.flatMap(s => dishesOf(s.items)))
    const flavour = dayFlavour(today, this.state.trailingDays)
    void validation
    return { remark: flavour.summary, streaks: flavour.streaks }
  }

  finish(): TurnOutcome {
    const validation = validateDay(daySlots(this.state), validationContext(this.state, this.now))
    const { remark, streaks } = this.remark(validation)
    const justAdded = new Set(
      this.state.slots.flatMap(s => s.items.map(i => i.dishId)).filter(id => !this.before.has(id))
    )

    const slots: SlotView[] = SLOT_ORDER.map(slot => {
      const stored = this.state.slots.find(s => s.slot === slot)
      const dishes = stored ? dishesOf(stored.items) : []
      const expanded = Boolean(stored && stored.source === 'planned' && dishes.length)
      const rows: RowView[] = dishes.map(d => ({
        dishId: d.id,
        nameEn: d.nameEn,
        shared: Boolean(d.fork),
        note: d.fork?.instructionEn,
        krishnaUnknown: !d.fork,
        justAdded: justAdded.has(d.id),
      }))
      return {
        slot,
        label: SLOT_LABEL[slot],
        layout: expanded ? 'menus' : 'line',
        summary: dishes.map(d => d.nameEn).join(', ') || '—',
        rows,
        given: stored?.source === 'given',
      }
    })

    const view: DayView = {
      date: this.state.date,
      weekday: weekdayOf(this.state.date),
      slots,
      remark,
      streaks,
      findings: findingViews(validation),
      shoppingList: validation.shoppingList,
      stage: this.state.stage,
    }

    return { state: this.state, view, card: this.buildCard() }
  }

  private buildCard(): KitchenCard | null {
    const planned = [...this.state.slots]
      .filter(s => s.source === 'planned' && s.items.length)
      .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot))
    const last = planned[planned.length - 1]
    if (!last) return null
    return buildCard(
      this.state.date,
      last.slot,
      dishesOf(last.items),
      this.state.eating,
      UNKNOWN_MENU_FOR
    )
  }
}

// A read with no turn in it — what the page shows on first load.
export function currentView(state: AppState, now: number = Date.now()): TurnOutcome {
  return new PlanTurn(state, now).finish()
}

export function slotOf(value: string): MealSlot | null {
  return (SLOT_ORDER as string[]).includes(value) ? (value as MealSlot) : null
}

export type { StoredSlot }
