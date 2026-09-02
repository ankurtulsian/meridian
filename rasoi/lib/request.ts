import { ConstraintDimension, EditContext } from './types'

// The active request lives here, not in the conversation transcript.
//
// A model re-reading a long thread will quietly resurrect a constraint that was
// dropped ten turns ago — it re-anchors on the original brief and drags you back
// to the first menu it proposed. A slot that holds exactly one value cannot do
// that. Sparring mutates this object; the transcript is only how the mutation was
// expressed.
//
// Every change carries provenance, so a contradiction is something the planner
// can name rather than something it silently resolves in its own favour.

export interface Constraint {
  id: string
  dimension: ConstraintDimension
  value: string
  // Free-form phrasing is the input — 'something light, Krishna's off his food'.
  // It resolves to facets and computed fields upstream, but the original words
  // are kept, because the resolution can be wrong and you should be able to see
  // what it thought you meant.
  raw: string
  // Gates are rare and non-negotiable. Nearly everything is a preference, which
  // means it competes in scoring instead of eliminating options.
  strength: 'gate' | 'preference'
  statedAt: number
  active: boolean
  supersededBy?: string
}

export interface Conflict {
  incoming: Constraint
  existing: Constraint
  // Flagged, never resolved on your behalf. The newer statement wins by default,
  // because in conversation recency is intent — but you are told what it cost, in
  // case the new idea was meant to sit alongside the old one rather than replace
  // it.
  note: string
}

export interface RequestState {
  constraints: Constraint[]
  // Everything said, in order. New ideas that contradict earlier ones are the
  // point of sparring, not a mistake to be corrected.
  said: string[]
}

export function emptyRequest(): RequestState {
  return { constraints: [], said: [] }
}

export function activeConstraints(state: RequestState): Constraint[] {
  return state.constraints.filter(c => c.active)
}

// Most dimensions hold one value at a time, and a new statement replacing the
// old one is the behaviour worth having: it is what stops a mood from ten turns
// ago quietly surviving.
//
// Ingredients are not like that. "No onions" and "use up the paneer" are two
// statements about two different things, and neither retracts the other. So for
// those, a statement only displaces one about the same item — "no onions"
// followed by "onions are fine" still conflicts, which is right.
const MULTI_VALUED: ConstraintDimension[] = ['ingredient']

// A leading minus is the whole of the negation. Keeping the polarity inside the
// value rather than in a field of its own is what lets a want and a refusal
// about the same item collide properly.
export function itemOf(value: string): string {
  return value.startsWith('-') ? value.slice(1) : value
}

function subjectOf(constraint: Constraint): string {
  return MULTI_VALUED.includes(constraint.dimension)
    ? `${constraint.dimension}:${itemOf(constraint.value)}`
    : constraint.dimension
}

export function applyConstraint(
  state: RequestState,
  incoming: Constraint
): { state: RequestState; conflict?: Conflict } {
  const clash = activeConstraints(state).find(
    c => subjectOf(c) === subjectOf(incoming) && c.value !== incoming.value
  )

  const constraints = state.constraints.map(c =>
    clash && c.id === clash.id ? { ...c, active: false, supersededBy: incoming.id } : c
  )

  const next: RequestState = {
    constraints: [...constraints, incoming],
    said: [...state.said, incoming.raw],
  }

  if (!clash) return { state: next }

  return {
    state: next,
    conflict: {
      incoming,
      existing: clash,
      note: `"${incoming.raw}" replaces "${clash.raw}" — say so if you meant both.`,
    },
  }
}

// Restores a superseded constraint. Sparring goes backwards as often as forwards,
// and changing your mind twice should cost one tap.
export function reinstate(state: RequestState, constraintId: string): RequestState {
  return {
    ...state,
    constraints: state.constraints.map(c =>
      c.id === constraintId ? { ...c, active: true, supersededBy: undefined } : c
    ),
  }
}

// The dimensions whose value is a facet, and so can be compared against how
// dishes are tagged. The others mean real things too, but they are not facets
// and putting them in here would not merely fail to help — an unmatchable value
// still counts towards the denominator, so it would drag down every dish at
// once. Each of the rest gets its own reading below.
const FACET_DIMENSIONS: ConstraintDimension[] = ['mood', 'nutrition', 'occasion']

// Facets the request is asking for, weighted. Gates count double so a stated
// non-negotiable outranks a passing mood.
export function intentWeights(state: RequestState): Record<string, number> {
  const weights: Record<string, number> = {}
  for (const c of activeConstraints(state)) {
    if (!FACET_DIMENSIONS.includes(c.dimension)) continue
    weights[c.value] = (weights[c.value] || 0) + (c.strength === 'gate' ? 2 : 1)
  }
  return weights
}

// Ingredients asked for and ruled out, as one signed set. Positive is wanted,
// negative is not — "use up the paneer" and "no onions" are the same kind of
// statement pointing opposite ways.
//
// Even a gate here only weighs heavily; it does not eliminate. You can buy an
// onion and you can leave one out, so a dish containing one is less wanted, not
// impossible. The genuine blocks stay where they belong, on the diner.
export function ingredientWishes(state: RequestState): Record<string, number> {
  const wishes: Record<string, number> = {}
  for (const c of activeConstraints(state)) {
    if (c.dimension !== 'ingredient') continue
    const magnitude = c.strength === 'gate' ? 2 : 1
    const item = itemOf(c.value).toLowerCase()
    wishes[item] = (wishes[item] || 0) + (c.value.startsWith('-') ? -magnitude : magnitude)
  }
  return wishes
}

const EASY = ['low', 'quick', 'easy', 'simple', 'weeknight']
const INVOLVED = ['high', 'elaborate', 'proper', 'project']

// Effort does not need a term of its own — there is already a dial for it. An
// effort constraint turns that dial up or down rather than adding a second,
// competing one.
export function effortPressure(state: RequestState): number {
  const stated = activeConstraints(state).find(c => c.dimension === 'effort')
  if (!stated) return 1
  const value = stated.value.toLowerCase()
  if (EASY.includes(value)) return 3
  if (INVOLVED.includes(value)) return 0.2
  return 1
}

const NEW = ['new', 'different', 'change', 'something-else']
const FAMILIAR = ['usual', 'familiar', 'favourite', 'safe']

// Variety is recency read out loud. Same reasoning: scale the dial that already
// exists rather than argue with it from a second direction.
export function varietyPressure(state: RequestState): number {
  const stated = activeConstraints(state).find(c => c.dimension === 'variety')
  if (!stated) return 1
  const value = stated.value.toLowerCase()
  if (NEW.includes(value)) return 2.5
  if (FAMILIAR.includes(value)) return 0.3
  return 1
}

export function contextOf(state: RequestState, base: EditContext): EditContext {
  return { ...base, requestPhrase: state.said[state.said.length - 1] }
}
