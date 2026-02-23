'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Trace, formatRelativeTime, formatDuration } from '@/lib/types'
import { fadeIn, slideUp } from '@/lib/motion'

/**
 * TraceHeader
 *
 * Header for trace detail page showing run ID, agent, timing, and summary stats.
 */

interface TraceHeaderProps {
  trace: Trace
}

export function TraceHeader({ trace }: TraceHeaderProps) {
  const hasErrors = trace.summary.errors > 0

  return (
    <div className="border-b border-white/5">
      <div className="container-wide py-8">
        {/* Breadcrumb */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="flex items-center gap-2 text-sm text-gray-500 mb-6"
        >
          <Link href="/traces" className="hover:text-white transition-colors">
            Traces
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-gray-400 font-mono">{trace.id}</span>
        </motion.div>

        {/* Title row */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <motion.div
            variants={slideUp}
            initial="initial"
            animate="animate"
            className="flex-1"
          >
            {/* Run ID as main title */}
            <div className="flex items-center gap-4 mb-3">
              <h1 className="font-mono text-3xl md:text-4xl font-medium text-white">
                {trace.id}
              </h1>
              {hasErrors && (
                <span className="px-3 py-1 text-sm font-medium bg-error/10 text-error rounded-full">
                  {trace.summary.errors} error{trace.summary.errors > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Filename */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <span className="font-mono text-sm text-gray-300">{trace.filename}</span>
              </div>
            </div>

            {/* Agent and app info */}
            <div className="flex items-center gap-4 text-gray-400">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                </svg>
                <span className="font-mono">{trace.agent_name}</span>
              </div>
              {trace.app_name && (
                <>
                  <span className="text-gray-600">·</span>
                  <span>{trace.app_name}</span>
                </>
              )}
            </div>
          </motion.div>

          {/* Duration badge */}
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            transition={{ delay: 0.1 }}
            className="flex flex-col items-start lg:items-end gap-3"
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5">
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-semibold text-white">
                {formatDuration(trace.summary.duration_ms)}
              </span>
            </div>
          </motion.div>
        </div>

        {/* Metadata grid */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mt-8 pt-8 border-t border-white/5"
        >
          <MetadataItem label="Run ID" value={trace.id} mono />
          <MetadataItem label="Agent" value={trace.agent_name} mono />
          <MetadataItem label="Started" value={formatRelativeTime(trace.startedAt)} />
          <MetadataItem label="Duration" value={formatDuration(trace.summary.duration_ms)} />
          <MetadataItem label="LLM Calls" value={trace.summary.llm_calls.toString()} />
          <MetadataItem label="Tool Calls" value={trace.summary.tool_calls.toString()} />
        </motion.div>
      </div>
    </div>
  )
}

function MetadataItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-gray-500 uppercase tracking-wider mb-1">
        {label}
      </span>
      <span className={`text-white ${mono ? 'font-mono text-sm' : ''}`}>
        {value}
      </span>
    </div>
  )
}
