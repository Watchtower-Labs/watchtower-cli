import type { Metadata } from 'next'
import { Inter, JetBrains_Mono, Playfair_Display } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'Watchtower — Agent Supervision, Refined',
  description: 'Monitor, review, and approve autonomous agent runs with precision. Terminal-native observability for AI agents.',
  keywords: ['observability', 'AI agents', 'CLI', 'terminal', 'monitoring', 'tracing', 'Google ADK', 'debugging', 'watchtower', 'agent supervision'],
  authors: [{ name: 'Watchtower Labs' }],
  openGraph: {
    title: 'Watchtower — Agent Supervision, Refined',
    description: 'Monitor, review, and approve autonomous agent runs with precision.',
    type: 'website',
    siteName: 'Watchtower',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Watchtower — Agent Supervision, Refined',
    description: 'Monitor, review, and approve autonomous agent runs with precision.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${playfairDisplay.variable}`}>
      <body className="antialiased bg-black text-white min-h-screen">
        {children}
      </body>
    </html>
  )
}
