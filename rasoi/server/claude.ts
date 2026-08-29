import Anthropic from '@anthropic-ai/sdk'
import { MealSlot, PantryItem } from '../lib/types'
import { Emit } from './events'
import { ConstraintInput, PlanTurn, slotOf, TurnOutcome } from './planner'
import { LIBRARY_BLOCK, stateBlock, SYSTEM_CORE } from './prompt'
import { AppState } from './session'

const MODEL = 'claude-opus-5'
const MAX_ITERATIONS = 8

// Fixed order, fixed shape. Tools render at position 0 of the prompt, so a set
// that varies between requests would invalidate the cache for everything behind
// it — including the dish library, which is the part worth caching.
const TOOLS: Anthropic.Tool[] = [
  {
    name: 'state_constraint',
    description:
      'Record something they have said about what they want, so it competes in the ranking and so a later statement that contradicts it can be named rather than silently resolved. One value per dimension, and a new one replaces the old — except ingredients, where each item is tracked separately, so ruling out onions does not undo asking for the paneer.',
    input_schema: {
      type: 'object',
      properties: {
        dimension: {
          type: 'string',
          enum: ['diners', 'slot', 'mood', 'nutrition', 'ingredient', 'effort', 'variety', 'occasion'],
        },
        value: {
          type: 'string',
          description:
            'Depends on the dimension. For mood, nutrition and occasion, a facet from the fixed vocabulary. For ingredient, the ingredient in lowercase — prefixed with a minus to rule it out, so "use up the paneer" is "paneer" and "no onions" is "-onion". For effort, one of low, quick, easy, simple, weeknight, high, elaborate, proper, project. For variety, one of new, different, change, usual, familiar, favourite.',
        },
        raw: { type: 'string', description: 'Their own words, verbatim.' },
        strength: {
          type: 'string',
          enum: ['gate', 'preference'],
          description: 'Almost always preference. A gate eliminates dishes outright and is for genuine non-negotiables only.',
        },
      },
      required: ['dimension', 'value', 'raw', 'strength'],
    },
  },
  {
    name: 'note_pantry',
    description:
      'Record something they have said is in the house. Only ever what they actually said — nothing here is inferred from a plan or a shopping list. Ingredients in the pantry tilt the ranking towards using them up.',
    input_schema: {
      type: 'object',
      properties: {
        item: { type: 'string', description: 'The ingredient, lowercase, as it would appear in a recipe: bhindi, paneer, lauki.' },
        quantitySignal: { type: 'string', enum: ['a little', 'some', 'a lot'] },
        raw: { type: 'string', description: 'Their own words, verbatim.' },
      },
      required: ['item', 'quantitySignal', 'raw'],
    },
  },
  {
    name: 'shortlist',
    description:
      'Rank what could go in a meal, given everything recorded so far — what was cooked recently, what is in the house, what they have asked for, who is eating. Returns candidates with the reasons behind their placing. You must call this before naming a dish for a meal, and you may only plan dishes it has returned.',
    input_schema: {
      type: 'object',
      properties: {
        slot: { type: 'string', enum: ['breakfast', 'lunch', 'snacks', 'dinner'] },
        satisfying: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Optional. Narrows the field to dishes that would answer a particular gap — pass the options from a breach, such as roti or rice for a dal with no carb beside it. Without this the plain staples rarely surface: they match no mood and are cooked constantly, so the ranking buries them.',
        },
      },
      required: ['slot'],
    },
  },
  {
    name: 'set_plan',
    description:
      'Put dishes into a meal, replacing whatever was there. Every id must have come back from shortlist this turn, or already be in that meal. Returns the balance findings for the whole day, the day\'s flavour in one sentence, anything that needs buying, and any dish left without the thing that usually goes beside it.',
    input_schema: {
      type: 'object',
      properties: {
        slot: { type: 'string', enum: ['breakfast', 'lunch', 'snacks', 'dinner'] },
        dishIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['slot', 'dishIds'],
    },
  },
  {
    name: 'stage',
    description:
      'Mark where the agreement stands. "converged" when the plan has stopped moving and you are about to ask whether to send it. "confirmed" only after they have answered that question with a yes. Confirming without having asked is refused.',
    input_schema: {
      type: 'object',
      properties: { stage: { type: 'string', enum: ['converged', 'confirmed'] } },
      required: ['stage'],
    },
  },
]

function run(turn: PlanTurn, name: string, input: unknown): unknown {
  const args = (input ?? {}) as Record<string, unknown>
  switch (name) {
    case 'state_constraint':
      return turn.stateConstraint(args as unknown as ConstraintInput)
    case 'note_pantry':
      return turn.notePantry(
        args as unknown as { item: string; quantitySignal: PantryItem['quantitySignal']; raw: string }
      )
    case 'shortlist': {
      const slot = slotOf(String(args.slot))
      if (!slot) return { error: 'Unknown meal.' }
      const satisfying = Array.isArray(args.satisfying) ? args.satisfying.map(String) : undefined
      return turn.shortlist(slot, satisfying)
    }
    case 'set_plan': {
      const slot = slotOf(String(args.slot))
      if (!slot) return { error: 'Unknown meal.' }
      const ids = Array.isArray(args.dishIds) ? args.dishIds.map(String) : []
      return turn.setPlan(slot as MealSlot, ids)
    }
    case 'stage':
      return turn.setStage(args.stage === 'confirmed' ? 'confirmed' : 'converged')
    default:
      return { error: `No such tool: ${name}` }
  }
}

// Some deployments reject a mid-conversation system message. Remembered per
// process so the fallback is paid for once rather than every turn.
let midConversationSystemWorks = true

function buildMessages(
  state: AppState,
  userText: string,
  now: Date,
  useSystemRole: boolean
): Anthropic.MessageParam[] {
  // The transcript opens with the system speaking; the API needs a user turn
  // first, so that greeting is dropped rather than reordered.
  const history = [...state.turns]
  while (history.length && history[0].role === 'assistant') history.shift()

  const block = stateBlock(state, now)
  const messages: Anthropic.MessageParam[] = history.map(t => ({
    role: t.role,
    content: t.text,
  }))

  if (useSystemRole) {
    messages.push({ role: 'user', content: userText })
    // The non-spoofable operator channel, and — because it sits after the cached
    // history rather than in front of it — the placement that leaves the cache
    // intact.
    messages.push({ role: 'system', content: block } as Anthropic.MessageParam)
  } else {
    messages.push({ role: 'user', content: `<state>\n${block}\n</state>\n\n${userText}` })
  }
  return messages
}

export function hasApiKey(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function converse(
  state: AppState,
  userText: string,
  emit: Emit,
  now: number = Date.now()
): Promise<TurnOutcome> {
  const client = new Anthropic()
  const turn = new PlanTurn(state, now)
  turn.addTurn('user', userText)

  let messages = buildMessages(state, userText, new Date(now), midConversationSystemWorks)
  let spoken = ''

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let final: Anthropic.Message
    try {
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: 8000,
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system: [
          { type: 'text', text: SYSTEM_CORE },
          // Everything above this line is byte-identical on every turn of every
          // conversation. Everything below it is not.
          { type: 'text', text: LIBRARY_BLOCK, cache_control: { type: 'ephemeral' } },
        ],
        tools: TOOLS,
        messages,
      })
      stream.on('text', delta => {
        spoken += delta
        emit({ t: 'text', v: delta })
      })
      final = await stream.finalMessage()
    } catch (error) {
      if (
        error instanceof Anthropic.BadRequestError &&
        midConversationSystemWorks &&
        /role 'system'|role "system"/i.test(error.message)
      ) {
        // Retry once with the state folded into the user turn instead.
        midConversationSystemWorks = false
        messages = buildMessages(state, userText, new Date(now), false)
        i--
        continue
      }
      throw error
    }

    if (final.stop_reason === 'pause_turn') {
      messages = [...messages, { role: 'assistant', content: final.content }]
      continue
    }

    const calls = final.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )
    if (!calls.length) break

    messages = [...messages, { role: 'assistant', content: final.content }]
    const results: Anthropic.ToolResultBlockParam[] = calls.map(call => ({
      type: 'tool_result',
      tool_use_id: call.id,
      content: JSON.stringify(run(turn, call.name, call.input)),
    }))
    messages = [...messages, { role: 'user', content: results }]
  }

  turn.addTurn('assistant', spoken.trim() || '…')
  return turn.finish()
}
