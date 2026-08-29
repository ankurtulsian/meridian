import { NextRequest } from 'next/server'
import { DatabaseUnreachable, MissingDatabaseUrl, redact } from '../../../server/db'
import { PlanEvent } from '../../../server/events'
import { converse, hasApiKey } from '../../../server/claude'
import { currentView } from '../../../server/planner'
import { read, reset, write } from '../../../server/store'
import { converseStubbed } from '../../../server/stub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Anything that goes wrong reaching the database comes back as a sentence, not a
// stack trace. The person who will hit this is the person who typed the
// environment variable name, and a 500 with a stack in it tells him nothing about
// which variable or where to put it.
// Our own errors already name the host and nothing else. Anything else is
// scrubbed on the way out, because an unrecognised error is exactly the one whose
// wording nobody has checked.
function unreachable(error: unknown): Response {
  const known = error instanceof MissingDatabaseUrl || error instanceof DatabaseUnreachable
  const message = known
    ? (error as Error).message
    : redact(
        `Something went wrong reaching the database. ${
          error instanceof Error ? error.message : String(error)
        }`
      )
  return Response.json({ error: message }, { status: 503 })
}

export async function GET() {
  try {
    const state = await read()
    const { view, card } = currentView(state)
    return Response.json({ view, card, turns: state.turns, stubbed: !hasApiKey() })
  } catch (error) {
    return unreachable(error)
  }
}

export async function DELETE() {
  try {
    const state = await reset()
    const { view, card } = currentView(state)
    return Response.json({ view, card, turns: state.turns, stubbed: !hasApiKey() })
  } catch (error) {
    return unreachable(error)
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { text?: unknown }
  const text = typeof body.text === 'string' ? body.text.trim() : ''
  if (!text) return new Response('Say something first.', { status: 400 })

  // Read before opening the stream: a database that cannot be reached is a
  // readable failure, not a stream that dies halfway through a sentence.
  let state
  try {
    state = await read()
  } catch (error) {
    return unreachable(error)
  }

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
        send({ t: 'error', v: redact(error instanceof Error ? error.message : String(error)) })
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
