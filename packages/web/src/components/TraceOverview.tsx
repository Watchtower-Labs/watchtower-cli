'use client'

import { motion } from 'framer-motion'
import { Trace, formatDuration } from '@/lib/types'
import { fadeIn, staggerContainer, scaleIn } from '@/lib/motion'

/**
 * TraceOverview
 *
 * Overview tab content showing summary stats, tools used,
 * and token breakdown.
 */

interface TraceOverviewProps {
  trace: Trace
}

export function TraceOverview({ trace }: TraceOverviewProps) {
  const { summary } = trace

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="py-8 space-y-8"
    >
      {/* Stats grid */}
      <motion.section variants={fadeIn}>
        <h2 className="font-serif text-2xl font-medium text-white mb-6">
          Summary
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Duration"
            value={formatDuration(summary.duration_ms)}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="LLM Calls"
            value={summary.llm_calls.toString()}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
            }
          />
          <StatCard
            label="Tool Calls"
            value={summary.tool_calls.toString()}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
              </svg>
            }
          />
          <StatCard
            label="Errors"
            value={summary.errors.toString()}
            isError={summary.errors > 0}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
          />
        </div>
      </motion.section>

      {/* Token breakdown */}
      <motion.section variants={fadeIn}>
        <h2 className="font-serif text-2xl font-medium text-white mb-6">
          Token Usage
        </h2>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Total Tokens</span>
            <span className="text-2xl font-medium text-white font-mono">
              {summary.total_tokens.toLocaleString()}
            </span>
          </div>

          {/* Token bar visualization */}
          <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-6">
            <TokenBar total={summary.total_tokens} events={trace.events} />
          </div>

          {/* Token breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <TokenStat
              label="Input Tokens"
              value={getInputTokens(trace)}
              color="bg-info"
            />
            <TokenStat
              label="Output Tokens"
              value={getOutputTokens(trace)}
              color="bg-success"
            />
          </div>
        </div>
      </motion.section>

      {/* Tools used */}
      <motion.section variants={fadeIn}>
        <h2 className="font-serif text-2xl font-medium text-white mb-6">
          Tools Used
        </h2>
        {summary.tools_used.length > 0 ? (
          <div className="flex flex-wrap gap-3">
            {summary.tools_used.map((tool, index) => (
              <motion.div
                key={tool}
                variants={scaleIn}
                custom={index}
                className="flex items-center gap-2 px-4 py-2 glass rounded-full"
              >
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
                <span className="text-sm font-mono text-gray-300">{tool}</span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tools were used in this trace.</p>
        )}
      </motion.section>

      {/* CLI hint */}
      <motion.section variants={fadeIn}>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium mb-1">View in terminal</p>
              <p className="text-gray-400 text-sm mb-3">
                Use the CLI to view this trace with keyboard navigation.
              </p>
              <code className="inline-block px-3 py-1.5 bg-black/50 rounded-lg text-sm font-mono text-gray-300">
                watchtower show {trace.id}
              </code>
            </div>
          </div>
        </div>
      </motion.section>
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  icon,
  isError = false,
}: {
  label: string
  value: string
  icon: React.ReactNode
  isError?: boolean
}) {
  return (
    <motion.div variants={scaleIn} className="glass rounded-xl p-5">
      <div className={`mb-3 ${isError ? 'text-error' : 'text-gray-400'}`}>
        {icon}
      </div>
      <p className={`text-2xl font-medium ${isError ? 'text-error' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </motion.div>
  )
}

function TokenBar({ total, events }: { total: number; events: Trace['events'] }) {
  const inputTokens = getInputTokens({ events } as Trace)
  const outputTokens = getOutputTokens({ events } as Trace)

  const inputPercent = total > 0 ? (inputTokens / total) * 100 : 0
  const outputPercent = total > 0 ? (outputTokens / total) * 100 : 0

  return (
    <div className="absolute inset-0 flex">
      <motion.div
        className="h-full bg-info"
        initial={{ width: 0 }}
        animate={{ width: `${inputPercent}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
      <motion.div
        className="h-full bg-success"
        initial={{ width: 0 }}
        animate={{ width: `${outputPercent}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
      />
    </div>
  )
}

function TokenStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-white font-mono">{value.toLocaleString()}</p>
      </div>
    </div>
  )
}

function getInputTokens(trace: Trace): number {
  return trace.events
    .filter(e => e.type === 'llm.response' && e.input_tokens)
    .reduce((sum, e) => sum + (e.input_tokens || 0), 0)
}

function getOutputTokens(trace: Trace): number {
  return trace.events
    .filter(e => e.type === 'llm.response' && e.output_tokens)
    .reduce((sum, e) => sum + (e.output_tokens || 0), 0)
}
