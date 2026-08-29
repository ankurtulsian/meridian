'use client'

import { useEffect, useState } from 'react'
import { KitchenCard } from '../lib/card'
import { ForkIcon, SendIcon } from './icons'

// The only thing that leaves the conversation, and so the only thing with a
// screen of its own: a different reader, a different language.

export function ReviewSheet({
  card,
  weekday,
  slot,
  onClose,
}: {
  card: KitchenCard
  weekday: string
  slot: string
  onClose: () => void
}) {
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="sheet-scrim" role="dialog" aria-modal="true" aria-label="The kitchen card">
      <div className="sheet-head">
        <div className="wordmark">Rasoi</div>
        <div className="stamp">{weekday}</div>
      </div>

      <div className="sheet">
        <button type="button" className="grabber" onClick={onClose} aria-label="Close" />

        <div className="sheet-meta">
          <span>For the kitchen</span>
          <span>
            {weekday} · {slot}
          </span>
        </div>

        <div className="kcard">
          <div className="kcard-head">{card.headerHi}</div>
          <div className="kcard-cols">
            <span>{card.columnsHi[0]}</span>
            <span>{card.columnsHi[1]}</span>
          </div>

          {card.rows.map(row =>
            row.shared ? (
              <div className="shared-row" key={row.nameHi}>
                <div className="dish">{row.nameHi}</div>
                {row.noteHi && (
                  <div className="fork-note">
                    <ForkIcon />
                    <span>{row.noteHi}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="kcard-row" key={row.nameHi}>
                <div className="dish">{row.nameHi}</div>
                {row.toConfirm && <span className="chip">TO CONFIRM</span>}
              </div>
            )
          )}
        </div>

        <div className="method">
          <div className="method-title">{card.methodTitleHi}</div>
          {card.method.map((line, index) => (
            <p key={index}>{line}</p>
          ))}
          {card.footnote && <div className="footnote">{card.footnote}</div>}
        </div>

        <div className="sheet-spacer" />

        {sent ? (
          <p className="sheet-note">Nothing was sent — there is nowhere to send it yet.</p>
        ) : (
          <button type="button" className="sheet-send" onClick={() => setSent(true)}>
            <SendIcon />
            Send to the kitchen
          </button>
        )}
      </div>
    </div>
  )
}
