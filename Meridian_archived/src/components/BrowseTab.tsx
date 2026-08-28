'use client'
import { useState, useEffect } from 'react'
import { Restaurant } from '@/lib/types'
import { RestaurantCard } from './RestaurantCard'

interface BrowseTabProps {
  saved: Set<string>
  onSave: (r: Restaurant) => void
}

const FILTERS = ['All', 'Japanese', 'Italian', 'Mediterranean', 'Seafood', 'Lebanese', 'Steakhouse']

export function BrowseTab({ saved, onSave }: BrowseTabProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchRestaurants()
  }, [])

  async function fetchRestaurants(query?: string) {
    setLoading(true)
    try {
      const q = query || 'best restaurants Dubai fine dining'
      const res = await fetch(`/api/browse?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setRestaurants(data.restaurants || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = restaurants.filter(r => {
    if (filter !== 'All' && !r.cuisine.toLowerCase().includes(filter.toLowerCase())) return false
    if (search && !r.name.toLowerCase().includes(search.toLowerCase()) && !r.area.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleBook = (r: Restaurant) => {
    if (r.googleMapsUrl) window.open(r.googleMapsUrl, '_blank')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f7f4ef' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #e4ddd3',
          borderRadius: 16,
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#a8a29e" strokeWidth="2"/>
            <path d="m21 21-4.35-4.35" stroke="#a8a29e" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') fetchRestaurants(search) }}
            placeholder="Search restaurants, areas..."
            style={{ flex: 1, fontSize: 15, color: '#1c1917', background: 'none' }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div style={{
        padding: '12px 16px',
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '7px 16px',
              borderRadius: 20,
              border: '1px solid',
              borderColor: filter === f ? '#1c1917' : '#e4ddd3',
              background: filter === f ? '#1c1917' : '#ffffff',
              color: filter === f ? '#f7f4ef' : '#44403c',
              fontSize: 13,
              fontFamily: 'DM Sans, sans-serif',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Results */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        {loading ? (
          <div style={{ paddingTop: 60, textAlign: 'center' }}>
            <p style={{ color: '#78716c', fontSize: 14 }}>Finding the best places...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ paddingTop: 60, textAlign: 'center' }}>
            <p style={{ color: '#78716c', fontSize: 14 }}>No results found</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 12, color: '#a8a29e', marginBottom: 12 }}>
              {filtered.length} places in Dubai
            </p>
            {filtered.map((r, i) => (
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
    </div>
  )
}
