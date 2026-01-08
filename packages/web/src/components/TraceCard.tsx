'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Trace, formatRelativeTime, formatDuration, formatTokens } from '@/lib/types'
import { scaleIn } from '@/lib/motion'

/**
 * TraceCard
 *
 * Glass-effect card for displaying trace information.
 * Shows agent, app, timing, and summary stats.
 */

interface TraceCardProps {
  trace: Trace
  index?: number
}

export function TraceCard({ trace, index = 0 }: TraceCardProps) {
  const hasErrors = trace.summary.errors > 0

  return (
    <motion.div
      variants={scaleIn}
      initial="initial"
      animate="animate"
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/traces/${trace.id}`}>
        <motion.article
          className="group relative glass rounded-2xl p-6 cursor-pointer transition-all duration-300"
          whileHover={{
            scale: 1.01,
            transition: { duration: 0.2 },
          }}
          style={{
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* Hover glow effect */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(120, 119, 198, 0.06), transparent 40%)',
            }}
          />

          {/* Header: Run ID + Time */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <h3 className="font-mono text-lg font-medium text-white group-hover:text-gray-100 transition-colors">
                  {trace.id}
                </h3>
                {hasErrors && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-error/10 text-error rounded-full">
                    {trace.summary.errors} error{trace.summary.errors > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {trace.filename}
              </p>
            </div>

            {/* Duration badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-gray-300">
                {formatDuration(trace.summary.duration_ms)}
              </span>
            </div>
          </div>

          {/* Metadata row */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            {/* Agent */}
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
              <span className="font-mono text-gray-300">{trace.agent_name}</span>
            </div>

            {/* App */}
            {trace.app_name && (
              <div className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <span className="text-gray-400">{trace.app_name}</span>
              </div>
            )}

            {/* Time */}
            <div className="flex items-center gap-1.5 ml-auto">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <span>{formatRelativeTime(trace.startedAt)}</span>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-6 pt-4 border-t border-white/5">
            <Stat label="LLM Calls" value={trace.summary.llm_calls} />
            <Stat label="Tool Calls" value={trace.summary.tool_calls} />
            <Stat label="Tokens" value={formatTokens(trace.summary.total_tokens)} />

            {/* Tools used preview */}
            {trace.summary.tools_used.length > 0 && (
              <div className="ml-auto flex items-center gap-1.5">
                {trace.summary.tools_used.slice(0, 3).map((tool) => (
                  <span
                    key={tool}
                    className="px-2 py-0.5 text-xs font-mono bg-white/5 text-gray-400 rounded"
                  >
                    {tool}
                  </span>
                ))}
                {trace.summary.tools_used.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{trace.summary.tools_used.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
        </motion.article>
      </Link>
    </motion.div>
  )
}

function Stat({ label, value, isError = false }: { label: string; value: string | number; isError?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className={`text-lg font-medium ${isError ? 'text-error' : 'text-white'}`}>
        {value}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}
