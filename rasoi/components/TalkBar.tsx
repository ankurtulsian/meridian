'use client'

import { useEffect, useRef, useState } from 'react'
import { MicIcon, SendIcon } from './icons'

// Talking is the primary way in. Typing is here because browser speech
// recognition is unreliable enough that an app which only listens is an app that
// sometimes cannot be used at all.

// The Web Speech API is not in the standard DOM types. Only the parts used.
interface SpeechResultAlternative { transcript: string }
interface SpeechResult { 0: SpeechResultAlternative; isFinal: boolean }
interface SpeechResultList { length: number; [index: number]: SpeechResult }
interface SpeechEvent { resultIndex: number; results: SpeechResultList }
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechEvent) => void) | null
  onend: (() => void) | null
  onerror: ((event: { error: string }) => void) | null
}
type RecognitionCtor = new () => Recognition

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor
    webkitSpeechRecognition?: RecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

const HINTS = [
  '“there’s a lot of bhindi lying around”',
  '“something simple, we’re back late”',
  '“plan me the whole of sunday”',
]

export function TalkBar({
  onSend,
  busy,
  showHints,
}: {
  onSend: (text: string) => void
  busy: boolean
  showHints: boolean
}) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [available, setAvailable] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recognition = useRef<Recognition | null>(null)
  const finalRef = useRef('')

  useEffect(() => {
    setAvailable(recognitionCtor() !== null)
    return () => recognition.current?.abort()
  }, [])

  const submit = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed || busy) return
    setText('')
    onSend(trimmed)
  }

  const listen = () => {
    if (listening) {
      recognition.current?.stop()
      return
    }
    const Ctor = recognitionCtor()
    if (!Ctor) return
    setVoiceError(null)
    finalRef.current = ''
    const engine = new Ctor()
    engine.lang = 'en-IN'
    engine.continuous = false
    engine.interimResults = true
    engine.onresult = event => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) finalRef.current += result[0].transcript
        else interim += result[0].transcript
      }
      setText((finalRef.current + interim).trim())
    }
    engine.onerror = event => {
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone blocked — type instead.'
          : 'Did not catch that — type instead.'
      )
    }
    engine.onend = () => {
      setListening(false)
      recognition.current = null
      // Speaking is a whole utterance; there is no send button in the drawing.
      if (finalRef.current.trim()) submit(finalRef.current)
    }
    recognition.current = engine
    setListening(true)
    engine.start()
  }

  return (
    <div className="foot">
      {showHints && !listening && (
        <div className="hints" aria-hidden>
          {HINTS.map(hint => (
            <div className="hint" key={hint}>
              {hint}
            </div>
          ))}
        </div>
      )}
      {voiceError && <p className="remark">{voiceError}</p>}
      <div className={`bar${listening ? ' listening' : ''}${busy ? ' busy' : ''}`}>
        <button
          type="button"
          className={`mic${listening ? ' on' : ''}`}
          onClick={listen}
          disabled={!available || busy}
          title={available ? (listening ? 'Stop listening' : 'Tap and talk') : 'Voice is not available in this browser — type instead'}
          aria-label={listening ? 'Stop listening' : 'Talk'}
        >
          <MicIcon />
        </button>
        <input
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter') submit(text)
          }}
          placeholder={listening ? 'Listening…' : busy ? 'Thinking…' : 'Tap and talk'}
          disabled={busy}
          aria-label="Say something"
        />
        {text.trim() && !busy && (
          <button type="button" className="send" onClick={() => submit(text)} aria-label="Send">
            <SendIcon size={20} />
          </button>
        )}
      </div>
    </div>
  )
}
