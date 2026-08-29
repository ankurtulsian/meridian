// Lifted verbatim from the artboards.

export function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="2" width="6" height="11.5" rx="3" />
      <path d="M5.2 11a6.8 6.8 0 0 0 13.6 0" />
      <path d="M12 17.8v3.4" />
    </svg>
  )
}

export function ForkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 4v6a4 4 0 0 0 4 4h9" />
      <path d="M15 10l4 4-4 4" />
    </svg>
  )
}

export function SendIcon({ size = 19 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 3L10.4 13.6" />
      <path d="M21 3l-6.7 18-3.9-7.4L3 9.7z" />
    </svg>
  )
}
