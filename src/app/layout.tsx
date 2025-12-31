import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'Watchtower CLI - Terminal-based observability for AI agents',
  description: 'View agent activity, tool calls, LLM interactions, and execution history through your terminal. Zero-config setup for Google ADK.',
  keywords: ['observability', 'AI agents', 'Google ADK', 'terminal', 'CLI', 'debugging', 'tracing', 'watchtower'],
  authors: [{ name: 'Watchtower Labs' }],
  openGraph: {
    title: 'Watchtower CLI - Terminal-based observability for AI agents',
    description: 'View agent activity, tool calls, LLM interactions, and execution history through your terminal.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
