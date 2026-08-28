import { Nutrition } from './types'

// Macros as a flavour, not a readout.
//
// The estimates underneath are good to maybe ±20% on home cooking, so printing
// "42g protein" would dress a guess up as a measurement. A band is honest about
// exactly the same data, and it's the part you'd act on anyway — nobody changes
// dinner because it came to 42g rather than 48g; they change it because the week
// has been light on protein.
//
// Bands are relative to the household's own recent average rather than an
// external target. Nothing has to be configured, and "protein-heavy" comes to
// mean heavier than you actually eat, which is the only comparison that survives
// imprecise numbers. Absolute judgement comes from streaks instead: three light
// days running is a signal no single day can give.

export type Band = 'low' | 'normal' | 'high'
export type Dimension = 'protein' | 'fibre' | 'carbs' | 'richness'

// Ordered by how likely you are to do something about it.
const DIMENSIONS: Dimension[] = ['protein', 'richness', 'fibre', 'carbs']

// Enough history to have any idea what "usual" means here.
const MIN_HISTORY_DAYS = 4
// Inside this much of your own average is just an ordinary day.
const BAND_MARGIN = 0.2
const STREAK_MIN = 3

const PHRASES: Record<Dimension, Record<Band, string>> = {
  protein: { low: 'light on protein', normal: 'decent protein', high: 'protein-heavy' },
  fibre: { low: 'low on fibre', normal: 'reasonable fibre', high: 'fibre-heavy' },
  carbs: { low: 'carb-light', normal: 'ordinary carbs', high: 'carb-heavy' },
  richness: { low: 'clean', normal: 'not too rich', high: 'rich' },
}

function valueOf(n: Nutrition, dimension: Dimension): number {
  switch (dimension) {
    case 'protein': return n.proteinG
    case 'fibre': return n.fibreG ?? 0
    case 'carbs': return n.carbsG
    case 'richness': return n.fatG
  }
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

export function bandOf(value: number, baseline: number): Band {
  if (baseline <= 0) return 'normal'
  const ratio = value / baseline
  if (ratio < 1 - BAND_MARGIN) return 'low'
  if (ratio > 1 + BAND_MARGIN) return 'high'
  return 'normal'
}

export interface Reading {
  dimension: Dimension
  band: Band
  phrase: string
}

export interface DayFlavour {
  readings: Reading[]
  // The line people actually read. Everything else is detail underneath it.
  summary: string
  // What no single day can tell you.
  streaks: string[]
  // Said out loud rather than hidden, because bands against an unknown baseline
  // would be invention.
  baselineKnown: boolean
}

function streakOf(days: number[], baseline: number, band: Band): number {
  let run = 0
  for (let i = days.length - 1; i >= 0; i--) {
    if (bandOf(days[i], baseline) !== band) break
    run++
  }
  return run
}

export function dayFlavour(today: Nutrition, trailing: Nutrition[]): DayFlavour {
  const baselineKnown = trailing.length >= MIN_HISTORY_DAYS

  const readings: Reading[] = DIMENSIONS.map(dimension => {
    const baseline = mean(trailing.map(n => valueOf(n, dimension)))
    const band = baselineKnown ? bandOf(valueOf(today, dimension), baseline) : 'normal'
    return { dimension, band, phrase: PHRASES[dimension][band] }
  })

  if (!baselineKnown) {
    return {
      readings,
      summary: 'Not enough history yet to say how this compares.',
      streaks: [],
      baselineKnown,
    }
  }

  // Only the dimensions that departed from usual are worth a sentence; a day
  // where nothing stands out should say so in one short line.
  const notable = readings.filter(r => r.band !== 'normal')
  const summary = notable.length
    ? capitalise(joinPhrases(notable.map(r => r.phrase)))
    : 'A fairly ordinary day.'

  const streaks: string[] = []
  for (const dimension of DIMENSIONS) {
    const baseline = mean(trailing.map(n => valueOf(n, dimension)))
    const series = [...trailing.map(n => valueOf(n, dimension)), valueOf(today, dimension)]
    for (const band of ['low', 'high'] as Band[]) {
      const run = streakOf(series, baseline, band)
      if (run >= STREAK_MIN) {
        streaks.push(`${PHRASES[dimension][band]} ${run} days running`)
      }
    }
  }

  return { readings, summary, streaks, baselineKnown }
}

function joinPhrases(phrases: string[]): string {
  if (phrases.length === 1) return `${phrases[0]}.`
  const last = phrases[phrases.length - 1]
  return `${phrases.slice(0, -1).join(', ')} and ${last}.`
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
