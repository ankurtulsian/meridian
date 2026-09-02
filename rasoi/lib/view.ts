import { Dish, MealSlot, Nutrition, ValidationResult } from './types'

// Domain shaped for the screen, and nothing more.
//
// Pure like the rest of lib/: it imports types, computes, and returns. It knows
// what a day looks like when it is drawn, but nothing about React, and nothing
// about how the drawing happens.

export type Stage = 'open' | 'converged' | 'confirmed'

export interface Turn {
  role: 'user' | 'assistant'
  text: string
}

export interface RowView {
  dishId: string
  nameEn: string
  // A dish both menus share. Spans the full width, banded, carrying the note
  // that says how one pot serves two menus.
  shared: boolean
  note?: string
  // Krishna's own dishes are not known yet, so the second column is honestly
  // empty rather than quietly filled with the grown-ups' food.
  krishnaUnknown: boolean
  // What the last exchange added, so he can see what just moved.
  justAdded: boolean
}

export interface SlotView {
  slot: MealSlot
  label: string
  // A settled slot is a line; the one being planned opens into two menus.
  layout: 'line' | 'menus'
  // For the line layout.
  summary: string
  rows: RowView[]
  given: boolean
}

export interface FindingView {
  level: 'block' | 'warning'
  code: string
  message: string
  suggestion?: string
}

export interface DayView {
  date: string
  weekday: string
  slots: SlotView[]
  // The single line under the card. Either an observation about the day so far,
  // or — once something is planned — how it compares with how they usually eat.
  remark: string
  streaks: string[]
  findings: FindingView[]
  shoppingList: string[]
  stage: Stage
}

export const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner']

export const SLOT_LABEL: Record<MealSlot, string> = {
  breakfast: 'BREAKFAST',
  lunch: 'LUNCH',
  snacks: 'SNACKS',
  dinner: 'DINNER',
}

export function sumNutrition(dishes: Dish[]): Nutrition {
  return dishes.reduce<Nutrition>(
    (acc, d) => ({
      calories: acc.calories + d.nutrition.calories,
      proteinG: acc.proteinG + d.nutrition.proteinG,
      carbsG: acc.carbsG + d.nutrition.carbsG,
      fatG: acc.fatG + d.nutrition.fatG,
      fibreG: (acc.fibreG ?? 0) + (d.nutrition.fibreG ?? 0),
      estimatedFrom: 'llm',
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0, fibreG: 0, estimatedFrom: 'llm' }
  )
}

// Anchors worth naming out loud when they have already been used today. Ordered
// by how much they constrain what comes next.
const ANCHORS = ['rice', 'paneer', 'potato', 'atta']

const ANCHOR_LABEL: Record<string, string> = {
  rice: 'Rice',
  paneer: 'Paneer',
  potato: 'Potatoes',
  atta: 'Roti',
}

// Before anything is planned there is no flavour to report — a day with only
// breakfast and lunch in it reads "light on everything", which is true and
// useless. What is worth saying is what has already been eaten, because that is
// the constraint on what comes next.
export function openingRemark(settled: { slot: MealSlot; dishes: Dish[] }[]): string {
  for (const anchor of ANCHORS) {
    const found = settled.find(s =>
      s.dishes.some(d => d.ingredients.some(i => i.item.toLowerCase() === anchor))
    )
    if (found) return `${ANCHOR_LABEL[anchor]} already at ${found.slot} today.`
  }
  if (!settled.length) return 'Nothing decided yet today.'
  return 'Nothing else decided for today yet.'
}

export function findingViews(result: ValidationResult): FindingView[] {
  return [
    ...result.blocks.map(f => ({ level: 'block' as const, ...f })),
    ...result.warnings.map(f => ({ level: 'warning' as const, ...f })),
  ]
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function weekdayOf(date: string): string {
  // Parsed as UTC on purpose: the label must not shift with the reader's zone.
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()]
}
