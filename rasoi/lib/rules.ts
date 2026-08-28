import { EditContext, EditEvent, Rule, RuleStatus } from './types'

// Rule lifecycle.
//
// There is no proposal cadence, because a fixed schedule asks the wrong question.
// What matters is how much a rule claims: "Krishna skips rajma at dinner" is a
// narrow claim about one dish in one slot, cheap to make and cheap to withdraw,
// and two or three repeats settle it. "We've gone off rice" claims something
// about every meal, and it should have to earn that across many contexts.
//
// So rules surface when their evidence crosses a threshold set by their own
// specificity. In practice a micro rule shows up within a couple of days and a
// global one takes weeks — which is the behaviour a cadence was reaching for,
// without having to guess the interval.

// Dimensions that can pin a rule down. `date` is deliberately excluded: a rule
// that only holds on one date is an anecdote.
const SCOPE_KEYS: (keyof EditContext)[] = ['slot', 'eating', 'otherDishIds']

const GLOBAL_EVIDENCE = 7
const MIN_EVIDENCE = 2
// Beyond this, a rule you keep overriding stops being a rule and becomes a
// question.
const CHALLENGE_THRESHOLD = 3
// Cap per session. Approval only means something while it still costs attention;
// a queue of fifteen gets rubber-stamped.
export const MAX_PROPOSALS_PER_SESSION = 2

export function specificity(conditions: Partial<EditContext>): number {
  return SCOPE_KEYS.filter(k => conditions[k] !== undefined).length
}

export function isGlobal(rule: Pick<Rule, 'conditions'>): boolean {
  return specificity(rule.conditions) === 0
}

// A global claim needs seven supporting edits; each condition that narrows it
// takes two off, down to a floor of two.
export function evidenceThreshold(conditions: Partial<EditContext>): number {
  return Math.max(MIN_EVIDENCE, GLOBAL_EVIDENCE - 2 * specificity(conditions))
}

export function readyToPropose(rule: Pick<Rule, 'conditions' | 'supportingEditIds'>): boolean {
  return rule.supportingEditIds.length >= evidenceThreshold(rule.conditions)
}

// Ranked by how far past its own bar the evidence is, so the most settled rules
// surface first when the session budget is tight.
export function proposalQueue(candidates: Rule[]): Rule[] {
  return candidates
    .filter(r => r.status === 'proposed' && readyToPropose(r))
    .sort(
      (a, b) =>
        b.supportingEditIds.length / evidenceThreshold(b.conditions) -
        a.supportingEditIds.length / evidenceThreshold(a.conditions)
    )
    .slice(0, MAX_PROPOSALS_PER_SESSION)
}

// Every plan quietly tests every active rule. Going against one costs it
// confidence; going against it repeatedly brings it back for a decision rather
// than letting it keep applying against the evidence.
export function recordContradiction(rule: Rule, edit: EditEvent): Rule {
  const contradictingEditIds = [...rule.contradictingEditIds, edit.id]
  const support = Math.max(rule.supportingEditIds.length, 1)
  const confidence = Math.max(0, 1 - contradictingEditIds.length / support)

  const status: RuleStatus =
    contradictingEditIds.length >= CHALLENGE_THRESHOLD && rule.status === 'accepted'
      ? 'challenged'
      : rule.status

  return { ...rule, contradictingEditIds, confidence, status }
}

export function recordSupport(rule: Rule, edit: EditEvent): Rule {
  const supportingEditIds = [...rule.supportingEditIds, edit.id]
  const confidence = Math.max(
    0,
    1 - rule.contradictingEditIds.length / Math.max(supportingEditIds.length, 1)
  )
  return { ...rule, supportingEditIds, confidence }
}

// What the contradictions have in common is what the rule should have been
// scoped to in the first place. A rule that fails only at weekends doesn't need
// dropping — it needs the weekend carved out of it.
export function narrowingCondition(
  rule: Rule,
  edits: EditEvent[]
): Partial<EditContext> | null {
  const against = edits.filter(e => rule.contradictingEditIds.includes(e.id))
  if (against.length < CHALLENGE_THRESHOLD) return null

  for (const key of SCOPE_KEYS) {
    if (rule.conditions[key] !== undefined) continue
    const values = new Set(against.map(e => JSON.stringify(e.context[key])))
    // One shared value across every contradiction is the missing condition.
    if (values.size === 1) {
      return { ...rule.conditions, [key]: against[0].context[key] }
    }
  }
  return null
}

// A challenged rule is offered back with the narrowing already worked out, so the
// decision is "keep it for weekdays?" rather than "here's a problem, you sort it".
export function resolveChallenge(
  rule: Rule,
  edits: EditEvent[],
  now: number
): { narrowed?: Rule; retire?: Rule } {
  const condition = narrowingCondition(rule, edits)
  if (!condition) {
    return { retire: { ...rule, status: 'retired', decidedAt: now } }
  }
  return {
    narrowed: {
      ...rule,
      id: `${rule.id}-n`,
      conditions: condition,
      contradictingEditIds: [],
      confidence: 1,
      status: 'proposed',
      supersedes: rule.id,
      proposedAt: now,
    },
  }
}
