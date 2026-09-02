import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rasoi',
  description: "The day's meals, planned out loud.",
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f4f6f6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AE">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
