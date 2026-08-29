import { KitchenCard } from '../lib/card'
import { DayView } from '../lib/view'
import { Turn } from './session'

// What the page receives, one JSON object per line. Text arrives as it is
// written; the plan arrives once, at the end, because the plan is not something
// that should be watched changing its mind.
export type PlanEvent =
  | { t: 'text'; v: string }
  | { t: 'done'; v: { view: DayView; card: KitchenCard | null; turns: Turn[] } }
  | { t: 'error'; v: string }

export type Emit = (event: PlanEvent) => void
