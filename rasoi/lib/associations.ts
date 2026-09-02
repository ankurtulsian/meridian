import { Dish } from './types'

// What the system knows about food itself, as distinct from what it knows about
// this household.
//
// Preferences and rules describe the people: what they like, when they bend.
// Associations describe the food: rice on its own is not a meal, it needs
// something wet beside it. Khichdi arrives with curd and papad here, whatever
// anyone else does.
//
// The two are learned differently and must not be confused. A rule comes from
// repeated edits across varying contexts. An association comes from noticing
// what has always been true, or from simply being told — and being told is the
// important path, because a correction to a fact about food should stick rather
// than only fixing tonight's menu. That is the difference between a system that
// improves and one that is merely obedient.

export type AssociationKind =
  // Incomplete without at least one of the objects. The one that produces a
  // prompt: rice with nothing wet is a mistake worth naming.
  | 'needs'
  // Belong together, though neither requires the other. Nudges scoring; never
  // prompts on its own.
  | 'goes-with'
  // Either can fill the same place in a meal. What makes a sensible swap
  // sensible — roti for rice, not roti for dal.
  | 'stands-in-for'

export interface Association {
  id: string
  kind: AssociationKind
  // A dish name, or an ingredient standing for a family of them ('rice').
  subject: string
  // For 'needs', any single one of these satisfies it.
  objects: string[]
  // Stated outranks observed outranks assumed when they disagree — being told
  // something is stronger evidence than having inferred it.
  source: 'stated' | 'observed' | 'general'
  confidence: number
  // How often the household's own meals have borne it out. This is what turns a
  // general assumption into something specific to them.
  observedCount: number
  updatedAt: number
}

export interface Breach {
  association: Association
  // Phrased as a question. Like everything else here, it prompts rather than
  // blocks — plenty of good meals break a rule on purpose.
  prompt: string
}

const MIN_CONFIDENCE_TO_PROMPT = 0.5

function mentions(dishes: Dish[], term: string): boolean {
  const needle = term.toLowerCase()
  return dishes.some(
    d =>
      d.nameEn.toLowerCase().includes(needle) ||
      d.ingredients.some(i => i.item.toLowerCase().includes(needle))
  )
}

// Only 'needs' can be breached. A missing 'goes-with' is a slightly duller meal,
// not a mistake, and saying so every time would train them to ignore it.
export function breaches(dishes: Dish[], associations: Association[]): Breach[] {
  const found: Breach[] = []

  for (const association of associations) {
    if (association.kind !== 'needs') continue
    if (association.confidence < MIN_CONFIDENCE_TO_PROMPT) continue
    if (!mentions(dishes, association.subject)) continue
    if (association.objects.some(o => mentions(dishes, o))) continue

    found.push({
      association,
      prompt: `${cap(association.subject)} with nothing to go alongside — ${list(
        association.objects
      )}?`,
    })
  }

  return found
}

// Every meal that honours an association is quiet evidence for it; every meal
// that breaks it without complaint is evidence against. Confidence moves slowly,
// because one unusual dinner should not unseat something true.
export function observe(
  association: Association,
  held: boolean,
  now: number
): Association {
  const observedCount = association.observedCount + 1
  const drift = held ? 0.05 : -0.15
  return {
    ...association,
    observedCount,
    confidence: clamp(association.confidence + drift),
    updatedAt: now,
  }
}

// Being told resets the matter. Confidence goes to certain and the source is
// upgraded, because an argued correction is worth more than any amount of
// passive observation.
export function correct(
  association: Association,
  objects: string[],
  now: number
): Association {
  return {
    ...association,
    objects,
    source: 'stated',
    confidence: 1,
    updatedAt: now,
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n))
}

function cap(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function list(items: string[]): string {
  if (items.length === 1) return items[0]
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}
