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

export function applyConstraint(
  state: RequestState,
  incoming: Constraint
): { state: RequestState; conflict?: Conflict } {
  const clash = activeConstraints(state).find(
    c => c.dimension === incoming.dimension && c.value !== incoming.value
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

// Facets the request is asking for, weighted. Gates count double so a stated
// non-negotiable outranks a passing mood.
export function intentWeights(state: RequestState): Record<string, number> {
  const weights: Record<string, number> = {}
  for (const c of activeConstraints(state)) {
    if (c.dimension !== 'mood' && c.dimension !== 'nutrition') continue
    weights[c.value] = (weights[c.value] || 0) + (c.strength === 'gate' ? 2 : 1)
  }
  return weights
}

export function contextOf(state: RequestState, base: EditContext): EditContext {
  return { ...base, requestPhrase: state.said[state.said.length - 1] }
}
