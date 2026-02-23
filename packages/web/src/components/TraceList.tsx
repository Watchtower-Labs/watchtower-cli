'use client'

import { motion } from 'framer-motion'
import { Trace } from '@/lib/types'
import { TraceCard } from './TraceCard'
import { staggerContainer } from '@/lib/motion'

/**
 * TraceList
 *
 * Animated list of trace cards with staggered entrance.
 */

interface TraceListProps {
  traces: Trace[]
  emptyMessage?: string
}

export function TraceList({ traces, emptyMessage = 'No traces found' }: TraceListProps) {
  if (traces.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center py-24 text-center"
      >
        <div className="w-16 h-16 mb-6 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
        <p className="text-gray-400 text-lg">{emptyMessage}</p>
        <p className="text-gray-500 text-sm mt-2">
          Traces will appear here when your agents run
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="grid gap-4"
    >
      {traces.map((trace, index) => (
        <TraceCard key={trace.id} trace={trace} index={index} />
      ))}
    </motion.div>
  )
}

/**
 * TraceListSkeleton
 *
 * Loading state for the trace list.
 */
export function TraceListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-2xl p-6"
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="h-5 w-24 bg-white/5 rounded shimmer" />
              <div className="h-4 w-48 bg-white/5 rounded mt-2 shimmer" />
            </div>
            <div className="h-7 w-16 bg-white/5 rounded-full shimmer" />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="h-4 w-32 bg-white/5 rounded shimmer" />
            <div className="h-4 w-24 bg-white/5 rounded shimmer" />
          </div>
          <div className="flex gap-6 pt-4 border-t border-white/5">
            <div className="flex flex-col gap-1">
              <div className="h-5 w-6 bg-white/5 rounded shimmer" />
              <div className="h-3 w-16 bg-white/5 rounded shimmer" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-5 w-6 bg-white/5 rounded shimmer" />
              <div className="h-3 w-16 bg-white/5 rounded shimmer" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="h-5 w-10 bg-white/5 rounded shimmer" />
              <div className="h-3 w-12 bg-white/5 rounded shimmer" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
