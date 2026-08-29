'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { KitchenCard } from '../lib/card'
import { DayView, Turn } from '../lib/view'
import { DayCard } from '../components/DayCard'
import { ReviewSheet } from '../components/ReviewSheet'
import { TalkBar } from '../components/TalkBar'

// One screen. What is fixed is the order — wordmark, date, the day, the one-line
// remark, the talk, the bar — not the heights.

interface Payload {
  view: DayView
  card: KitchenCard | null
  turns: Turn[]
  stubbed?: boolean
  // Set instead of everything else when there is nowhere to keep anything.
  error?: string
}

type Event =
  | { t: 'text'; v: string }
  | { t: 'done'; v: Payload }
  | { t: 'error'; v: string }

export default function Page() {
  const [view, setView] = useState<DayView | null>(null)
  const [card, setCard] = useState<KitchenCard | null>(null)
  const [turns, setTurns] = useState<Turn[]>([])
  const [pending, setPending] = useState<string | null>(null)
  const [streaming, setStreaming] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [clock, setClock] = useState('')
  const [unreachable, setUnreachable] = useState<string | null>(null)
  const talkRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (method: 'GET' | 'DELETE' = 'GET') => {
    try {
      const response = await fetch('/api/plan', { method, cache: 'no-store' })
      const payload = (await response.json()) as Payload
      if (payload.error) {
        setUnreachable(payload.error)
        return
      }
      setUnreachable(null)
      setView(payload.view)
      setCard(payload.card)
      setTurns(payload.turns)
      setSheetOpen(false)
    } catch (error) {
      setUnreachable(error instanceof Error ? error.message : String(error))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  // Set after mount: the time on the server is not the time where he is, and a
  // clock rendered on both sides is a hydration mismatch waiting to happen.
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      )
    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    talkRef.current?.scrollTo({ top: talkRef.current.scrollHeight })
  }, [turns, streaming, pending])

  // The sheet exists only once he has agreed, and it arrives by itself when he
  // does — it is not somewhere he navigates to.
  useEffect(() => {
    if (view?.stage === 'confirmed') setSheetOpen(true)
  }, [view?.stage])

  const send = useCallback(async (text: string) => {
    setBusy(true)
    setFailed(null)
    setPending(text)
    setStreaming('')
    try {
      const response = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!response.ok || !response.body) throw new Error(await response.text())

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          const event = JSON.parse(line) as Event
          if (event.t === 'text') setStreaming(previous => previous + event.v)
          else if (event.t === 'error') setFailed(event.v)
          else if (event.t === 'done') {
            setView(event.v.view)
            setCard(event.v.card)
            setTurns(event.v.turns)
          }
        }
      }
    } catch (error) {
      setFailed(error instanceof Error ? error.message : String(error))
    } finally {
      setPending(null)
      setStreaming('')
      setBusy(false)
    }
  }, [])

  // Said plainly, on the screen, because the person who can fix it is the person
  // looking at it.
  if (unreachable) {
    return (
      <div className="frame">
        <div className="head">
          <div className="head-left">
            <div className="wordmark">Rasoi</div>
            <div className="stamp">Not set up yet</div>
          </div>
        </div>
        <div className="middle">
          <p className="remark">{unreachable}</p>
        </div>
        <button type="button" className="bar" onClick={() => void load()}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>Try again</span>
        </button>
      </div>
    )
  }

  if (!view) {
    return (
      <div className="frame">
        <div className="head">
          <div className="head-left">
            <div className="wordmark">Rasoi</div>
          </div>
        </div>
      </div>
    )
  }

  const plannedSlot = [...view.slots].reverse().find(s => s.layout === 'menus')
  const notable = view.findings.slice(0, 2)

  return (
    <div className="frame">
      <div className="head">
        <div className="head-left">
          <div className="wordmark">Rasoi</div>
          <div className="stamp">
            {view.weekday}
            {clock && ` · ${clock}`}
          </div>
        </div>
        <button type="button" className="reset" onClick={() => void load('DELETE')}>
          start over
        </button>
      </div>

      <div className="middle">
        <div className="pinned">
          <DayCard view={view} onOpen={() => setSheetOpen(true)} />
          <p className="remark">{view.remark}</p>
          {notable.length > 0 && (
            <ul className="findings">
              {notable.map(finding => (
                <li key={finding.code + finding.message} className={finding.level}>
                  {finding.message}
                  {finding.suggestion ? ` ${finding.suggestion}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="talk" ref={talkRef}>
          <div className="talk-inner">
            {turns.map((turn, index) => (
              <div
                key={`${index}-${turn.text.slice(0, 12)}`}
                className={`bubble ${turn.role === 'user' ? 'me' : 'them'}${
                  turn.role === 'assistant' &&
                  index === turns.length - 1 &&
                  view.stage === 'converged'
                    ? ' asking'
                    : ''
                }`}
              >
                {turn.text}
              </div>
            ))}
            {pending && <div className="bubble me">{pending}</div>}
            {streaming && <div className="bubble them">{streaming}</div>}
            {failed && <div className="bubble failed">{failed}</div>}
          </div>
        </div>
      </div>

      <TalkBar onSend={send} busy={busy} showHints={!turns.some(t => t.role === 'user')} />

      {sheetOpen && card && (
        <ReviewSheet
          card={card}
          weekday={view.weekday}
          slot={plannedSlot?.slot ?? 'dinner'}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  )
}
