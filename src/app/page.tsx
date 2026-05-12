'use client'
import { useState } from 'react'
import { Restaurant } from '@/lib/types'
import { ChatInterface } from '@/components/ChatInterface'
import { BrowseTab } from '@/components/BrowseTab'
import { SavedTab } from '@/components/SavedTab'

type Tab = 'ask' | 'all' | 'saved'

export default function Home() {
  const [tab, setTab] = useState<Tab>('ask')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [savedRestaurants, setSavedRestaurants] = useState<Restaurant[]>([])

  const handleSave = (r: Restaurant) => {
    setSaved(prev => {
      const next = new Set(prev)
      if (next.has(r.id)) {
        next.delete(r.id)
        setSavedRestaurants(prev => prev.filter(s => s.id !== r.id))
      } else {
        next.add(r.id)
        setSavedRestaurants(prev => [...prev, r])
      }
      return next
    })
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 430,
      margin: '0 auto',
      background: '#f7f4ef',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px 12px',
        background: '#f7f4ef',
        borderBottom: '1px solid #e4ddd3',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{
            fontFamily: 'DM Serif Display, serif',
            fontSize: 22,
            fontWeight: 400,
            color: '#1c1917',
            letterSpacing: '-0.3px',
          }}>
            Meridian
          </h1>
          <p style={{ fontSize: 11, color: '#a8a29e', marginTop: 1 }}>Dubai · Your concierge</p>
        </div>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: '#ede9e1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
        }}>
          👤
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ display: tab === 'ask' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <ChatInterface />
        </div>
        <div style={{ display: tab === 'all' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <BrowseTab saved={saved} onSave={handleSave} />
        </div>
        <div style={{ display: tab === 'saved' ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
          <SavedTab saved={saved} savedRestaurants={savedRestaurants} onSave={handleSave} />
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid #e4ddd3',
        background: '#f7f4ef',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {[
          { id: 'ask' as Tab, label: 'Ask', icon: '✦' },
          { id: 'all' as Tab, label: 'All', icon: '⊞' },
          { id: 'saved' as Tab, label: 'Saved', icon: '☆' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '12px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              fontFamily: 'DM Sans, sans-serif',
              transition: 'all 0.15s ease',
            }}
          >
            <span style={{
              fontSize: 18,
              color: tab === t.id ? '#1c1917' : '#a8a29e',
              lineHeight: 1,
            }}>
              {t.icon}
            </span>
            <span style={{
              fontSize: 11,
              color: tab === t.id ? '#1c1917' : '#a8a29e',
              fontWeight: tab === t.id ? 500 : 400,
            }}>
              {t.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
