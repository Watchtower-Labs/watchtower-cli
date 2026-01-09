'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { mockTraces, getAgentNames } from '@/lib/mock-data'
import { TraceList } from '@/components/TraceList'
import { Header } from '@/components/layout/Header'
import { fadeIn, slideUp, staggerContainer } from '@/lib/motion'

/**
 * Recent Traces
 *
 * View and browse trace files from your agents.
 * Equivalent to `watchtower list` in the CLI.
 */

export default function TracesPage() {
  const [agentFilter, setAgentFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const agents = getAgentNames()

  const filteredTraces = useMemo(() => {
    let traces = [...mockTraces]

    // Filter by agent
    if (agentFilter !== 'all') {
      traces = traces.filter(t => t.agent_name === agentFilter)
    }

    // Filter by search query (id or filename)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      traces = traces.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.filename.toLowerCase().includes(q) ||
        t.agent_name.toLowerCase().includes(q)
      )
    }

    // Sort by most recent first
    traces.sort((a, b) => b.startedAt - a.startedAt)

    return traces
  }, [agentFilter, searchQuery])

  return (
    <div className="min-h-screen bg-black">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-mesh pointer-events-none" />

      {/* Header */}
      <Header />

      {/* Main content */}
      <main className="relative container-wide py-12">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {/* Page header */}
          <motion.div variants={slideUp} className="mb-12">
            <h1 className="font-serif text-4xl md:text-5xl font-medium text-white mb-4">
              Recent Traces
            </h1>
            <p className="text-lg text-gray-400 max-w-2xl">
              Browse and analyze trace files from your agent runs. Each trace contains
              a complete record of LLM calls, tool executions, and state changes.
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div variants={fadeIn} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by run ID or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                />
              </div>

              {/* Agent filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Agent:</span>
                <select
                  value={agentFilter}
                  onChange={(e) => setAgentFilter(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                >
                  <option value="all">All agents</option>
                  {agents.map(agent => (
                    <option key={agent} value={agent}>{agent}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Trace count */}
          <motion.div variants={fadeIn} className="mb-6">
            <p className="text-sm text-gray-500">
              Showing {filteredTraces.length} {filteredTraces.length === 1 ? 'trace' : 'traces'}
            </p>
          </motion.div>

          {/* Trace list */}
          <motion.div variants={fadeIn}>
            <TraceList
              traces={filteredTraces}
              emptyMessage={
                searchQuery
                  ? 'No traces match your search'
                  : 'No traces found'
              }
            />
          </motion.div>

          {/* CLI hint */}
          <motion.div variants={fadeIn} className="mt-12 p-6 glass rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium mb-1">Prefer the terminal?</p>
                <p className="text-gray-400 text-sm mb-3">
                  Use the CLI to view traces directly in your terminal.
                </p>
                <code className="inline-block px-3 py-1.5 bg-black/50 rounded-lg text-sm font-mono text-gray-300">
                  watchtower list
                </code>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  )
}
