import { describe, expect, it } from 'vitest'
import { DISHES } from '../../lib/library'
import { PlanTurn } from '../planner'
import { emptyDay, isoDate } from '../session'

const NOW = Date.parse('2026-08-29T16:00:00Z')

describe('the ranking orders, it does not exclude', () => {
  // The guard against quietly reintroducing a cut. Weights nobody has fitted to
  // real choices may decide what is listed first; they may not decide what
  // exists, because the chooser cannot ask for what it was never shown.
  it('hands back every eligible dish, not a selection from them', () => {
    const turn = new PlanTurn(emptyDay(isoDate(NOW)), NOW)
    const { candidates, truncated } = turn.shortlist('dinner')
    const eligible = DISHES.filter(d => d.status !== 'retired')
    expect(candidates).toHaveLength(eligible.length)
    expect(truncated).toBeUndefined()
  })

  it('offers the plain staples a mood-driven ranking buries', () => {
    // Roti matches no mood and is cooked constantly, so it sinks — and under the
    // old cut it fell off the list entirely, which is how a dal came to be
    // proposed as a whole dinner with nothing to eat it with.
    const turn = new PlanTurn(emptyDay(isoDate(NOW)), NOW)
    const { candidates } = turn.shortlist('dinner')
    expect(candidates.map(c => c.dishId)).toContain('roti')
  })

  it('lets a low-ranked dish be planned, not merely listed', () => {
    const turn = new PlanTurn(emptyDay(isoDate(NOW)), NOW)
    const { candidates } = turn.shortlist('dinner')
    const worst = candidates[candidates.length - 1]
    const result = turn.setPlan('dinner', [worst.dishId])
    expect(result.ok).toBe(true)
  })

  it('says so if the context guard ever does bite', () => {
    const turn = new PlanTurn(emptyDay(isoDate(NOW)), NOW)
    // Narrowed to a gap, the field is smaller but still whole.
    const { candidates, truncated } = turn.shortlist('dinner', ['roti', 'rice'])
    expect(truncated).toBeUndefined()
    expect(candidates.length).toBeGreaterThan(0)
    expect(candidates.length).toBeLessThan(DISHES.length)
  })
})
