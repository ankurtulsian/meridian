'use client'
import { Restaurant } from '@/lib/types'
import { formatPrice, formatRating } from '@/lib/places'

interface RestaurantCardProps {
  restaurant: Restaurant
  isLead?: boolean
  onBook?: (r: Restaurant) => void
  onSave?: (r: Restaurant) => void
  saved?: boolean
}

export function RestaurantCard({ restaurant: r, isLead, onBook, onSave, saved }: RestaurantCardProps) {
  const stars = Math.round(r.rating)

  return (
    <div style={{
      background: '#ffffff',
      border: isLead ? '1.5px solid #2d2d2d' : '1px solid #e4ddd3',
      borderRadius: 20,
      overflow: 'hidden',
      marginBottom: 12,
      animation: 'fadeUp 0.35s ease forwards',
    }}>
      {/* Photo */}
      {r.photo ? (
        <div style={{ width: '100%', height: 160, overflow: 'hidden', background: '#ede9e1' }}>
          <img
            src={r.photo}
            alt={r.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            loading="lazy"
          />
        </div>
      ) : (
        <div style={{
          width: '100%', height: 120, background: '#ede9e1',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 32 }}>🍽</span>
        </div>
      )}

      <div style={{ padding: '16px 18px 18px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1, marginRight: 12 }}>
            <h3 style={{ fontSize: 17, fontWeight: 500, color: '#1c1917', marginBottom: 2, lineHeight: 1.3 }}>
              {r.name}
            </h3>
            <p style={{ fontSize: 13, color: '#78716c' }}>{r.area}</p>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#1c1917' }}>{formatPrice(r.priceLevel)}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, color: '#c9a96e' }}>{'★'.repeat(Math.min(stars, 5))}</span>
              <span style={{ fontSize: 12, color: '#78716c' }}>{formatRating(r.rating)}</span>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          <Tag>{r.cuisine}</Tag>
          {r.openNow !== undefined && (
            <Tag color={r.openNow ? '#d1fae5' : '#fee2e2'} textColor={r.openNow ? '#065f46' : '#991b1b'}>
              {r.openNow ? 'Open now' : 'Closed'}
            </Tag>
          )}
          {r.matchScore && <Tag color="#fef3c7" textColor="#92400e">{r.matchScore}% match</Tag>}
        </div>

        {/* Concierge blurb */}
        {r.conciergeBlurb && (
          <div style={{
            borderLeft: '2px solid #e4ddd3',
            paddingLeft: 12,
            marginBottom: 12,
          }}>
            <p style={{ fontSize: 13.5, color: '#44403c', lineHeight: 1.6, fontStyle: 'italic' }}>
              {r.conciergeBlurb}
            </p>
          </div>
        )}

        {/* Review snippet */}
        {r.reviewSnippet && (
          <p style={{
            fontSize: 12.5,
            color: '#78716c',
            lineHeight: 1.55,
            marginBottom: 14,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
          }}>
            "{r.reviewSnippet}"
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => onBook?.(r)}
            style={{
              flex: 1,
              padding: '11px 0',
              background: '#1c1917',
              color: '#f7f4ef',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              fontFamily: 'DM Sans, sans-serif',
            }}
          >
            Reserve a table
          </button>
          <button
            onClick={() => onSave?.(r)}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: '1px solid #e4ddd3',
              background: saved ? '#fef3c7' : '#f7f4ef',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {saved ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Tag({ children, color = '#f7f4ef', textColor = '#78716c' }: {
  children: React.ReactNode
  color?: string
  textColor?: string
}) {
  return (
    <span style={{
      fontSize: 12,
      padding: '3px 10px',
      borderRadius: 20,
      background: color,
      color: textColor,
      fontWeight: 400,
    }}>
      {children}
    </span>
  )
}
