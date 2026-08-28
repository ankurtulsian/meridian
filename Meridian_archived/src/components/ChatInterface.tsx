'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import { Message, Restaurant } from '@/lib/types'
import { parseChips, cleanContent } from '@/lib/agent'
import { RestaurantCard } from './RestaurantCard'
import { useVoice } from './useVoice'

const INITIAL_MESSAGE: Message = {
  id: '0',
  role: 'assistant',
  content: 'Good evening. What are you looking for tonight?',
  chips: ['Dinner for two', 'Planning a birthday', 'Quick lunch', 'Something else...'],
  timestamp: Date.now(),
}

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [showAll, setShowAll] = useState(false)
  const [allResults, setAllResults] = useState<Restaurant[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages, loading])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      })

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      const rawContent: string = data.content || ''
      const chips = parseChips(rawContent)
      const cleanedContent = cleanContent(rawContent)
      const restaurants: Restaurant[] = data.restaurants || []

      if (restaurants.length > 0) setAllResults(restaurants)

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanedContent,
        chips: chips.length > 0 ? chips : undefined,
        results: restaurants.length > 0 ? restaurants.slice(0, 5) : undefined,
        timestamp: Date.now(),
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (e: any) {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Something went wrong. Try again in a moment.',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const { isListening, isSupported, startListening, stopListening } = useVoice(sendMessage)

  const handleBook = (r: Restaurant) => {
    if (r.googleMapsUrl) window.open(r.googleMapsUrl, '_blank')
  }

  const handleSave = (r: Restaurant) => {
    setSaved(prev => {
      const next = new Set(prev)
      next.has(r.id) ? next.delete(r.id) : next.add(r.id)
      return next
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f7f4ef' }}>
      {/* Messages */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}>
        {messages.map((msg, i) => (
          <div key={msg.id} style={{ animation: 'fadeUp 0.3s ease forwards', animationDelay: `${i === messages.length - 1 ? 0 : 0}ms` }}>
            {msg.role === 'assistant' ? (
              <div style={{ maxWidth: '88%', marginBottom: 4 }}>
                {/* Avatar + message */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: '#1c1917', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, marginBottom: 2,
                  }}>
                    <span style={{ fontSize: 11, color: '#f7f4ef', fontWeight: 500 }}>M</span>
                  </div>
                  {msg.content && (
                    <div style={{
                      background: '#ffffff',
                      borderRadius: '18px 18px 18px 4px',
                      padding: '12px 16px',
                      fontSize: 15,
                      color: '#1c1917',
                      lineHeight: 1.55,
                      border: '1px solid #e4ddd3',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}>
                      {msg.content}
                    </div>
                  )}
                </div>

                {/* Restaurant results */}
                {msg.results && msg.results.length > 0 && (
                  <div style={{ marginLeft: 38 }}>
                    {msg.results.map((r, ri) => (
                      <RestaurantCard
                        key={r.id}
                        restaurant={r}
                        isLead={ri === 0}
                        onBook={handleBook}
                        onSave={handleSave}
                        saved={saved.has(r.id)}
                      />
                    ))}

                    {/* Bottom actions */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <button
                        onClick={() => sendMessage('Help me narrow these down')}
                        style={actionBtnStyle}
                      >
                        Narrow it down ↗
                      </button>
                      <button
                        onClick={() => sendMessage('Show me more options')}
                        style={actionBtnStyle}
                      >
                        Show more ↗
                      </button>
                    </div>
                  </div>
                )}

                {/* Chips */}
                {msg.chips && msg.chips.length > 0 && (
                  <div style={{
                    marginLeft: 38,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 8,
                    marginTop: 6,
                    marginBottom: 4,
                  }}>
                    {msg.chips.map(chip => (
                      <button
                        key={chip}
                        onClick={() => sendMessage(chip)}
                        style={{
                          padding: '8px 16px',
                          borderRadius: 20,
                          border: '1px solid #d4cdc4',
                          background: '#ffffff',
                          color: '#44403c',
                          fontSize: 14,
                          fontFamily: 'DM Sans, sans-serif',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseDown={e => (e.currentTarget.style.background = '#ede9e1')}
                        onMouseUp={e => (e.currentTarget.style.background = '#ffffff')}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
                <div style={{
                  background: '#2d2d2d',
                  borderRadius: '18px 18px 4px 18px',
                  padding: '12px 16px',
                  fontSize: 15,
                  color: '#f7f4ef',
                  lineHeight: 1.55,
                  maxWidth: '80%',
                }}>
                  {msg.content}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#1c1917', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 11, color: '#f7f4ef', fontWeight: 500 }}>M</span>
            </div>
            <div style={{
              background: '#ffffff',
              borderRadius: '18px 18px 18px 4px',
              padding: '14px 18px',
              border: '1px solid #e4ddd3',
              display: 'flex',
              gap: 5,
              alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#a8a29e',
                  animation: 'pulse 1.2s ease infinite',
                  animationDelay: `${i * 0.2}s`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} style={{ height: 16 }} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '12px 16px 16px',
        background: '#f7f4ef',
        borderTop: '1px solid #e4ddd3',
      }}>
        {/* Listening indicator */}
        {isListening && (
          <div style={{
            textAlign: 'center',
            fontSize: 13,
            color: '#78716c',
            marginBottom: 8,
            animation: 'pulse 1s ease infinite',
          }}>
            Listening...
          </div>
        )}

        <div style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          background: '#ffffff',
          border: '1px solid #e4ddd3',
          borderRadius: 24,
          padding: '8px 8px 8px 16px',
        }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
            placeholder="Tell me what you're looking for..."
            style={{
              flex: 1,
              fontSize: 15,
              color: '#1c1917',
              background: 'none',
              caretColor: '#1c1917',
            }}
          />

          {/* Voice button */}
          {isSupported && (
            <button
              onClick={isListening ? stopListening : startListening}
              style={{
                width: 38,
                height: 38,
                borderRadius: '50%',
                background: isListening ? '#1c1917' : '#f7f4ef',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                flexShrink: 0,
                border: '1px solid #e4ddd3',
                position: 'relative',
              }}
            >
              {isListening && (
                <div style={{
                  position: 'absolute',
                  inset: -3,
                  borderRadius: '50%',
                  border: '2px solid #1c1917',
                  animation: 'ripple 1.2s ease infinite',
                }} />
              )}
              <span>{isListening ? '⏹' : '🎤'}</span>
            </button>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: input.trim() && !loading ? '#1c1917' : '#e4ddd3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.15s ease',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke={input.trim() && !loading ? '#f7f4ef' : '#a8a29e'} strokeWidth="2" strokeLinecap="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke={input.trim() && !loading ? '#f7f4ef' : '#a8a29e'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 0',
  borderRadius: 12,
  border: '1px solid #e4ddd3',
  background: '#f7f4ef',
  color: '#44403c',
  fontSize: 13,
  fontFamily: 'DM Sans, sans-serif',
}
