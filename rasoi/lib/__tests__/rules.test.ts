import { describe, expect, it } from 'vitest'
import { dayFlavour } from '../flavour'
import { buildCard, INGREDIENT_HI } from '../card'
import { DISHES, DISH_BY_ID } from '../library'
import { rank } from '../scoring'
import { DINERS, STAPLES } from '../seed'
import { Nutrition } from '../types'
import { validateDay } from '../validate'

const NOW = Date.parse('2026-08-29T16:00:00Z')
const DAY = 86_400_000

const ctx = (over: Partial<Parameters<typeof rank>[1]> = {}) => ({
  eating: DINERS,
  pantry: [],
  staples: STAPLES,
  outcomes: [],
  lastServedAt: {},
  intent: {},
  now: NOW,
  ...over,
})

describe('ranking never refuses', () => {
  // The failure that kills constraint-solver meal planners is "no valid menu
  // found". Nobody has a hard rule recorded, so nothing is gated out — a store
  // run has to be a cost, not a wall.
  it('returns every active dish even with nothing in the house', () => {
    const ranked = rank(DISHES, ctx())
    expect(ranked).toHaveLength(DISHES.filter(d => d.status !== 'retired').length)
  })

  it('sinks a dish cooked yesterday below the same dish untouched', () => {
    const fresh = rank(DISHES, ctx()).findIndex(d => d.dishId === 'khichdi')
    const stale = rank(
      DISHES,
      ctx({ lastServedAt: { khichdi: NOW - DAY } })
    ).findIndex(d => d.dishId === 'khichdi')
    expect(stale).toBeGreaterThan(fresh)
  })

  it('lifts a dish that uses up what is going off', () => {
    const before = rank(DISHES, ctx()).findIndex(d => d.dishId === 'bhindi-masala')
    const after = rank(
      DISHES,
      ctx({
        pantry: [
          {
            id: 'p1',
            item: 'bhindi',
            quantitySignal: 'a lot',
            raw: 'lots of bhindi lying around',
            confidence: 1,
            firstMentionedAt: NOW,
            lastConfirmedAt: NOW,
          },
        ],
      })
    ).findIndex(d => d.dishId === 'bhindi-masala')
    expect(after).toBeLessThan(before)
  })
})

describe('the day is the unit', () => {
  it('only complains about two rich meals once the second one lands', () => {
    const base = {
      eating: DINERS,
      pantry: [],
      staples: STAPLES,
      lastServedAt: {},
      trailingDays: [],
      targets: { dailyCalories: 2000, dailyProteinG: 60 },
      now: NOW,
    }
    const lunchOnly = validateDay(
      [{ slot: 'lunch' as const, dishes: [DISH_BY_ID['rajma-chawal']] }],
      base
    )
    expect(lunchOnly.warnings.some(w => w.code === 'day-balance')).toBe(false)

    const bothRich = validateDay(
      [
        { slot: 'lunch' as const, dishes: [DISH_BY_ID['rajma-chawal']] },
        { slot: 'dinner' as const, dishes: [DISH_BY_ID['pav-bhaji']] },
      ],
      base
    )
    expect(bothRich.warnings.some(w => w.code === 'day-balance')).toBe(true)
  })
})

describe('flavour never invents a baseline', () => {
  const day: Nutrition = {
    calories: 1900, proteinG: 55, carbsG: 260, fatG: 60, fibreG: 25, estimatedFrom: 'llm',
  }

  it('says so rather than guessing when there is no history', () => {
    const reading = dayFlavour(day, [])
    expect(reading.baselineKnown).toBe(false)
    expect(reading.summary).toMatch(/not enough history/i)
  })

  it('reports a direction, never a number, once there is', () => {
    const trailing = Array.from({ length: 6 }, () => day)
    const light = dayFlavour({ ...day, proteinG: 20 }, trailing)
    expect(light.summary).toMatch(/light on protein/i)
    expect(light.summary).not.toMatch(/\d/)
  })
})

describe('the card is readable by the person it is for', () => {
  // The cook reads Hindi. A dish whose measured ingredients have no Hindi name
  // silently drops them from the narrative, so this fails loudly instead.
  it('has a Hindi name for every measured ingredient in the library', () => {
    const missing = new Set<string>()
    for (const dish of DISHES) {
      for (const ingredient of dish.ingredients) {
        if (!ingredient.quantity || ingredient.optional) continue
        if (!INGREDIENT_HI[ingredient.item.toLowerCase()]) missing.add(ingredient.item)
      }
    }
    expect([...missing]).toEqual([])
  })

  it('writes the whole narrative in Devanagari', () => {
    const card = buildCard(
      '2026-08-29',
      'dinner',
      [DISH_BY_ID['khichdi'], DISH_BY_ID['curd']],
      ['ankur', 'shruti', 'krishna'],
      ['krishna']
    )
    // Latin letters would mean an English word survived into the cook's copy.
    // Digits are fine: quantities are read as digits either way.
    expect(card.method.join(' ')).not.toMatch(/[A-Za-z]/)
    expect(card.method[0]).toContain('कटोरी')
    expect(card.rows[0].noteHi).toContain('कृष्णा')
  })
})
