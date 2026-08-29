import { NextRequest } from 'next/server'
import { PlanEvent } from '../../../server/events'
import { converse, hasApiKey } from '../../../server/claude'
import { currentView } from '../../../server/planner'
import { read, reset, write } from '../../../server/store'
import { converseStubbed } from '../../../server/stub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET rehydrates the page: the day as it stands, with no turn taken.
export async function GET() {
  const state = await read()
  const { view, card } = currentView(state)
  return Response.json({
    view,
    card,
    turns: state.turns,
    stubbed: !hasApiKey(),
  })
}

export async function DELETE() {
  const state = await reset()
  const { view, card } = currentView(state)
  return Response.json({ view, card, turns: state.turns, stubbed: !hasApiKey() })
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { text?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return new Response('Say something first.', { status: 400 })

  const state = await read()
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: PlanEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
      }
      try {
        // Same engine either way. Without a key the model is replaced; nothing
        // else is.
        const outcome = hasApiKey()
          ? await converse(state, text, send)
          : await converseStubbed(state, text, send)
        await write(outcome.state)
        send({
          t: 'done',
          v: { view: outcome.view, card: outcome.card, turns: outcome.state.turns },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        send({ t: 'error', v: message })
        // The page still gets a plan back, so a failed turn leaves it showing
        // what it showed before rather than an empty screen.
        const { view, card } = currentView(state)
        send({ t: 'done', v: { view, card, turns: state.turns } })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
