'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TraceEvent, formatDuration } from '@/lib/types'
import { fadeIn, staggerContainer } from '@/lib/motion'

/**
 * TimelineView
 *
 * Elegant vertical timeline showing all trace events.
 * Expandable event details with smooth animations.
 */

interface TimelineViewProps {
  events: TraceEvent[]
  startTime: number
}

const eventConfig: Record<TraceEvent['type'], { icon: React.ReactNode; color: string; label: string }> = {
  'run.start': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
      </svg>
    ),
    color: 'bg-success',
    label: 'Run Started',
  },
  'run.end': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
      </svg>
    ),
    color: 'bg-gray-500',
    label: 'Run Completed',
  },
  'llm.request': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />
      </svg>
    ),
    color: 'bg-info',
    label: 'LLM Request',
  },
  'llm.response': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0 0l6.75-6.75M12 19.5l-6.75-6.75" />
      </svg>
    ),
    color: 'bg-info',
    label: 'LLM Response',
  },
  'tool.start': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    color: 'bg-warning',
    label: 'Tool Started',
  },
  'tool.end': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'bg-success',
    label: 'Tool Completed',
  },
  'tool.error': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
    color: 'bg-error',
    label: 'Tool Error',
  },
  'state.change': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    color: 'bg-purple-500',
    label: 'State Change',
  },
  'agent.transfer': {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h-.75A2.25 2.25 0 004.5 9.75v7.5a2.25 2.25 0 002.25 2.25h7.5a2.25 2.25 0 002.25-2.25v-7.5a2.25 2.25 0 00-2.25-2.25h-.75m0-3l-3-3m0 0l-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 012.25 2.25v7.5a2.25 2.25 0 01-2.25 2.25h-7.5a2.25 2.25 0 01-2.25-2.25v-.75" />
      </svg>
    ),
    color: 'bg-cyan-500',
    label: 'Agent Transfer',
  },
}

export function TimelineView({ events, startTime }: TimelineViewProps) {
  const [expandedEvent, setExpandedEvent] = useState<number | null>(null)

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="py-8"
    >
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

        {/* Events */}
        <div className="space-y-1">
          {events.map((event, index) => {
            const config = eventConfig[event.type]
            const isExpanded = expandedEvent === index
            const relativeTime = event.timestamp - startTime

            return (
              <motion.div
                key={index}
                variants={fadeIn}
                custom={index}
                className="relative"
              >
                <button
                  onClick={() => setExpandedEvent(isExpanded ? null : index)}
                  className="w-full text-left group"
                >
                  <div className="flex items-start gap-4 py-3 px-2 -mx-2 rounded-xl transition-colors hover:bg-white/5">
                    {/* Event node */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-10 h-10 rounded-full
                      ${config.color} bg-opacity-20 ring-4 ring-black
                      group-hover:ring-white/5 transition-all
                    `}>
                      <span className={config.color.replace('bg-', 'text-')}>
                        {config.icon}
                      </span>
                    </div>

                    {/* Event content */}
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-white">
                            {config.label}
                          </span>
                          {event.tool_name && (
                            <span className="px-2 py-0.5 text-xs font-mono bg-white/5 rounded text-gray-400">
                              {event.tool_name}
                            </span>
                          )}
                          {event.model && (
                            <span className="px-2 py-0.5 text-xs font-mono bg-white/5 rounded text-gray-400">
                              {event.model}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 font-mono shrink-0">
                          +{formatDuration(relativeTime)}
                        </span>
                      </div>

                      {/* Brief preview */}
                      {!isExpanded && getEventPreview(event) && (
                        <p className="text-sm text-gray-500 mt-1 truncate">
                          {getEventPreview(event)}
                        </p>
                      )}
                    </div>

                    {/* Expand indicator */}
                    <div className="pt-2">
                      <motion.svg
                        className="w-4 h-4 text-gray-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </motion.svg>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-14 mb-4 p-4 glass rounded-xl">
                        <EventDetails event={event} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}

function EventDetails({ event }: { event: TraceEvent }) {
  const details: { label: string; value: string | number }[] = []

  if (event.duration_ms !== undefined) {
    details.push({ label: 'Duration', value: formatDuration(event.duration_ms) })
  }
  if (event.agent_name) {
    details.push({ label: 'Agent', value: event.agent_name })
  }
  if (event.model) {
    details.push({ label: 'Model', value: event.model })
  }
  if (event.total_tokens !== undefined) {
    details.push({ label: 'Total Tokens', value: event.total_tokens.toLocaleString() })
  }
  if (event.input_tokens !== undefined) {
    details.push({ label: 'Input Tokens', value: event.input_tokens.toLocaleString() })
  }
  if (event.output_tokens !== undefined) {
    details.push({ label: 'Output Tokens', value: event.output_tokens.toLocaleString() })
  }
  if (event.from_agent && event.to_agent) {
    details.push({ label: 'Transfer', value: `${event.from_agent} → ${event.to_agent}` })
  }

  return (
    <div className="space-y-4">
      {/* Detail grid */}
      {details.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {details.map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</p>
              <p className="text-white font-mono text-sm">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tool args */}
      {event.tool_args && Object.keys(event.tool_args).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Arguments</p>
          <pre className="p-3 bg-black/50 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto">
            {JSON.stringify(event.tool_args, null, 2)}
          </pre>
        </div>
      )}

      {/* Error message */}
      {event.error_message && (
        <div>
          <p className="text-xs text-error uppercase tracking-wider mb-2">Error</p>
          <p className="p-3 bg-error/10 border border-error/20 rounded-lg text-sm text-error">
            {event.error_message}
          </p>
        </div>
      )}

      {/* State delta */}
      {event.state_delta && Object.keys(event.state_delta).length > 0 && (
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">State Changes</p>
          <pre className="p-3 bg-black/50 rounded-lg text-sm font-mono text-gray-300 overflow-x-auto">
            {JSON.stringify(event.state_delta, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

function getEventPreview(event: TraceEvent): string | null {
  if (event.error_message) return event.error_message
  if (event.tool_args?.query) return `Query: "${event.tool_args.query}"`
  if (event.total_tokens) return `${event.total_tokens.toLocaleString()} tokens`
  if (event.duration_ms) return formatDuration(event.duration_ms)
  return null
}
