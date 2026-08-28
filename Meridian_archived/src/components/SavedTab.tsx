'use client'
import { Restaurant } from '@/lib/types'
import { RestaurantCard } from './RestaurantCard'

interface SavedTabProps {
  saved: Set<string>
  savedRestaurants: Restaurant[]
  onSave: (r: Restaurant) => void
}

export function SavedTab({ saved, savedRestaurants, onSave }: SavedTabProps) {
  const handleBook = (r: Restaurant) => {
    if (r.googleMapsUrl) window.open(r.googleMapsUrl, '_blank')
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: '16px', background: '#f7f4ef' }}>
      {savedRestaurants.length === 0 ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '60%',
          gap: 12,
        }}>
          <span style={{ fontSize: 40 }}>☆</span>
          <p style={{ fontSize: 16, color: '#78716c', textAlign: 'center', lineHeight: 1.6 }}>
            Places you save will appear here.{'\n'}Build your list over time.
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 12, color: '#a8a29e', marginBottom: 12 }}>
            {savedRestaurants.length} saved {savedRestaurants.length === 1 ? 'place' : 'places'}
          </p>
          {savedRestaurants.map(r => (
            <RestaurantCard
              key={r.id}
              restaurant={r}
              onBook={handleBook}
              onSave={onSave}
              saved={saved.has(r.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}
