import { DISH_BY_ID } from '../lib/library'
import { MealSlot } from '../lib/types'
import { SLOT_ORDER } from '../lib/view'
import { Emit } from './events'
import { Candidate, PlanTurn, TurnOutcome } from './planner'
import { AppState } from './session'

// The app with the model taken out of it.
//
// What is faked here is exactly one thing: understanding English and writing a
// sentence. Everything else runs for real — the same PlanTurn, the same ranking,
// the same day validation, the same flavour reading, the same rule that a plan
// cannot be sent until it has been asked about and answered. So a walk through
// the app without a key exercises the machinery and not a puppet of it.
//
// It is keyword matching. It is meant to be obviously keyword matching.

const MOODS: [RegExp, string, string][] = [
  [/\b(light|halka|simple|easy)\b/, 'mood', 'light'],
  [/\b(rich|indulgent|treat)\b/, 'mood', 'rich'],
  [/\b(heavy|filling)\b/, 'mood', 'heavy'],
  [/\b(quick|fast|jaldi|late|back late|no time)\b/, 'mood', 'quick'],
  [/\b(comfort|comforting)\b/, 'mood', 'comfort'],
  [/\b(rice|chawal|carbs?)\b/, 'mood', 'carb-led'],
  [/\b(protein)\b/, 'nutrition', 'protein-rich'],
  [/\b(fibre|fiber)\b/, 'nutrition', 'high-fibre'],
  [/\b(south indian|dosa|idli|sambar)\b/, 'mood', 'south-indian'],
  [/\b(digest|stomach|off his food|off her food|unwell|not well)\b/, 'mood', 'easy-to-digest'],
]

const PANTRY_WORDS = [
  'bhindi', 'paneer', 'lauki', 'palak', 'baingan', 'potato', 'aloo', 'peas',
  'capsicum', 'cauliflower', 'curd', 'dahi', 'tomato', 'cucumber', 'rajma', 'chana',
]

const HAVE = /\b(lying|lots of|a lot of|loads|plenty|have|got|left over|leftover|spare|fridge|rakha|bahut|pada)\b/

const AGREE = /\b(that'?s fine|thats fine|fine|ok|okay|yes|yeah|yep|sure|go ahead|do it|perfect|haan|han|theek|send it|send)\b/
const REFUSE = /\b(no|nah|not that|something else|change it|instead)\b/

const SLOT_WORDS: [RegExp, MealSlot][] = [
  [/\b(breakfast|nashta|morning)\b/, 'breakfast'],
  [/\b(lunch|dopahar)\b/, 'lunch'],
  [/\b(snack|shaam|evening)\b/, 'snacks'],
  [/\b(dinner|raat|tonight|evening meal)\b/, 'dinner'],
]

function detectSlot(text: string, state: AppState): MealSlot {
  for (const [pattern, slot] of SLOT_WORDS) if (pattern.test(text)) return slot
  // Snacks are only ever planned when asked for. Nobody opens this to be told
  // about their four o'clock.
  const open = SLOT_ORDER.filter(s => s !== 'snacks').find(slot => {
    const stored = state.slots.find(s => s.slot === slot)
    return stored?.source === 'planned' && !stored.items.length
  })
  return open ?? 'dinner'
}

function isQuestion(text: string): boolean {
  return text.trim().endsWith('?') || /^(what|why|how|which|who|is|are|can|could|does)\b/.test(text)
}

function pick(candidates: Candidate[], objects: string[]): Candidate | undefined {
  return candidates.find(c => {
    const dish = DISH_BY_ID[c.dishId]
    return objects.some(
      o =>
        dish.id.includes(o) ||
        dish.nameEn.toLowerCase().includes(o) ||
        dish.ingredients.some(i => i.item.toLowerCase().includes(o))
    )
  })
}

function list(names: string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

export async function converseStubbed(
  state: AppState,
  userText: string,
  emit: Emit,
  now: number = Date.now()
): Promise<TurnOutcome> {
  const turn = new PlanTurn(state, now)
  turn.addTurn('user', userText)
  const text = userText.toLowerCase()

  const say = async (line: string) => {
    turn.addTurn('assistant', line)
    // Chunked so the page's streaming path is the one being exercised, not a
    // second, easier path that only exists without a key.
    for (const word of line.split(' ')) {
      emit({ t: 'text', v: `${word} ` })
      await new Promise(r => setTimeout(r, 16))
    }
  }

  const hasPlan = turn.current.slots.some(s => s.source === 'planned' && s.items.length)

  // --- agreement ---------------------------------------------------------
  if (AGREE.test(text) && !REFUSE.test(text) && hasPlan) {
    if (turn.current.stage === 'converged') {
      turn.setStage('confirmed')
      await say('Right — here it is as the kitchen will get it.')
      return turn.finish()
    }
    turn.setStage('converged')
    await say('Shall I send this over?')
    return turn.finish()
  }

  // --- being asked something, without changing anything -------------------
  if (isQuestion(text) && hasPlan) {
    const planned = turn.current.slots
      .filter(s => s.source === 'planned' && s.items.length)
      .flatMap(s => s.items.map(i => DISH_BY_ID[i.dishId]))
    const carbiest = [...planned].sort((a, b) => b.nutrition.carbsG - a.nutrition.carbsG)[0]
    const proteiniest = [...planned].sort((a, b) => b.nutrition.proteinG - a.nutrition.proteinG)[0]
    if (/carb|rice|heavy/.test(text)) {
      await say(`The ${carbiest.nameEn.toLowerCase()}, mostly.`)
    } else if (/protein/.test(text)) {
      await say(`The ${proteiniest.nameEn.toLowerCase()} is carrying most of it.`)
    } else {
      await say(`${list(planned.map(d => d.nameEn))} — ${planned[0].facets.slice(0, 2).join(', ')}.`)
    }
    return turn.finish()
  }

  // --- otherwise, plan something -----------------------------------------
  const claimed = new Set<string>()
  for (const [pattern, dimension, value] of MOODS) {
    // One value per dimension. Firing twice from one sentence would make the
    // second silently supersede the first, which is the machinery working
    // correctly on an input that was wrong.
    if (claimed.has(dimension) || !pattern.test(text)) continue
    claimed.add(dimension)
    turn.stateConstraint({
      dimension: dimension as 'mood' | 'nutrition',
      value,
      raw: userText,
      strength: 'preference',
    })
  }

  if (HAVE.test(text)) {
    for (const word of PANTRY_WORDS) {
      if (text.includes(word)) {
        turn.notePantry({
          item: word === 'aloo' ? 'potato' : word === 'dahi' ? 'curd' : word,
          quantitySignal: /\b(lots|a lot|loads|plenty|bahut)\b/.test(text) ? 'a lot' : 'some',
          raw: userText,
        })
      }
    }
  }

  const slot = detectSlot(text, turn.current)
  const { candidates } = turn.shortlist(slot)
  // The ranker does not know which meal it is ranking for — nothing in the
  // scoring model carries a slot — so upma and chilla come back as eligible at
  // dinner as anything else. Choosing is the chooser's job, and this is the
  // chooser, so it happens here rather than by quietly reweighting the ranking.
  const fitting = candidates.filter(
    c => !(slot !== 'breakfast' && c.facets.includes('breakfast-ish'))
  )
  const usable = fitting.length ? fitting : candidates
  if (!usable.length) {
    await say('Nothing I can put here — everything is either just cooked or ruled out.')
    return turn.finish()
  }

  const main = usable[0]
  let chosen = [main.dishId]
  let applied = turn.setPlan(slot, chosen)

  // Rice with nothing wet beside it is the sort of thing the association layer
  // exists to catch. Fix it and say so, rather than only reporting it.
  let added: string | null = null
  if (applied.ok && applied.breaches.length) {
    const side = pick(usable, applied.breaches[0].objects)
    if (side) {
      chosen = [...chosen, side.dishId]
      const retry = turn.setPlan(slot, chosen)
      if (retry.ok) {
        applied = retry
        added = side.nameEn
      }
    }
  }

  if (!applied.ok) {
    await say('That did not go through — try asking again.')
    return turn.finish()
  }

  const names = chosen.map(id => DISH_BY_ID[id].nameEn)
  const because = main.reasons[0] ?? 'it fits'
  const fork = DISH_BY_ID[main.dishId].fork
  const alongside = added ? ` ${added} alongside.` : ''
  // The remark is already under the card. Saying it again is the machine
  // admiring its own work.
  const extra = fork ? ` One pot — ${fork.instructionEn.replace(/^One pot — /, '')}` : alongside
  await say(`${list(names)}, then — ${because}.${extra}`)

  return turn.finish()
}
