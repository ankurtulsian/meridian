'use client'

import { DayView } from '../lib/view'
import { ForkIcon } from './icons'

// The day, pinned. It never scrolls; it grows and shrinks with what is in it, so
// an undecided dinner is one line and a decided one opens into two menus.

export function DayCard({ view, onOpen }: { view: DayView; onOpen?: () => void }) {
  const settled = view.stage !== 'open'
  const openable = view.stage === 'confirmed' && Boolean(onOpen)

  const body = view.slots.map((slot, index) => {
    const divided = index > 0 ? ' divided' : ''

    if (slot.layout === 'line') {
      return (
        <div className={`line-row${divided}`} key={slot.slot}>
          <div className="slot-label">{slot.label}</div>
          <div className={`summary${slot.summary === '—' ? ' empty' : ''}`}>{slot.summary}</div>
        </div>
      )
    }

    return (
      <div className={`menus${divided}`} key={slot.slot}>
        <div className="menus-label">{slot.label}</div>
        <div className="cols">
          <span className="col-head">ANKUR &amp; SHRUTI</span>
          <span className="col-head">KRISHNA</span>
        </div>
        {slot.rows.map(row =>
          row.shared ? (
            // One pot, two menus. The dish they share spans the width.
            <div className="shared-row" key={row.dishId}>
              <div className="dish">{row.nameEn}</div>
              {row.note && (
                <div className="fork-note">
                  <ForkIcon />
                  <span>{row.note}</span>
                </div>
              )}
            </div>
          ) : (
            <div
              className={`split-row${row.justAdded ? ' fresh' : ''}`}
              key={row.dishId}
            >
              <div className="dish">{row.nameEn}</div>
              {/* Krishna's own dishes have not been given to us. An honest gap. */}
              {row.krishnaUnknown && <span className="chip">TO CONFIRM</span>}
            </div>
          )
        )}
      </div>
    )
  })

  const className = `day${settled ? ' settled' : ''}${openable ? ' openable' : ''}`

  return openable ? (
    <button type="button" className={className} onClick={onOpen} title="Open the kitchen card">
      {body}
    </button>
  ) : (
    <div className={className}>{body}</div>
  )
}
