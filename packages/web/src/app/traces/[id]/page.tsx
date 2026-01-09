'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { getTraceById } from '@/lib/mock-data'
import { TraceHeader } from '@/components/TraceHeader'
import { TraceOverview } from '@/components/TraceOverview'
import { TimelineView } from '@/components/TimelineView'
import { Header } from '@/components/layout/Header'

/**
 * Trace Detail Page
 *
 * View a single trace with overview and timeline tabs.
 * Equivalent to `watchtower show <trace>` in the CLI.
 */

type TabId = 'overview' | 'timeline'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
      </svg>
    ),
  },
]

export default function TraceDetailPage() {
  const params = useParams<{ id: string }>()
  const trace = getTraceById(params.id)
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  if (!trace) {
    return <NotFoundState />
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />

      {/* Header */}
      <Header />

      {/* Trace header */}
      <TraceHeader trace={trace} />

      {/* Tabs */}
      <div className="border-b border-white/5">
        <div className="container-wide">
          <nav className="flex items-center gap-8" aria-label="Trace tabs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    relative flex items-center gap-2 py-4 text-sm font-medium transition-colors
                    ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'}
                  `}
                  aria-selected={isActive}
                  role="tab"
                >
                  {tab.icon}
                  {tab.label}

                  {isActive && (
                    <motion.div
                      layoutId="traceTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <main className="relative container-wide">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <TraceOverview trace={trace} />
            </motion.div>
          )}

          {activeTab === 'timeline' && (
            <motion.div
              key="timeline"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <TimelineView events={trace.events} startTime={trace.startedAt} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

function NotFoundState() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="fixed inset-0 bg-mesh pointer-events-none" />
      <div className="relative text-center">
        <h1 className="font-serif text-6xl font-medium text-white mb-4">404</h1>
        <p className="text-gray-400 mb-8">Trace not found</p>
        <a
          href="/traces"
          className="inline-flex items-center justify-center px-6 py-3 bg-white text-black rounded-full font-medium hover:bg-gray-100 transition-colors"
        >
          Back to Traces
        </a>
      </div>
    </div>
  )
}
