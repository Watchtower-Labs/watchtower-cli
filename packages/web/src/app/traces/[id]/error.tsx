'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function TraceDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Trace detail error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Failed to load trace</h2>
      <p className="text-gray-400 text-sm mb-6">This trace could not be loaded. It may have been deleted or is corrupted.</p>
      <div className="flex gap-3">
        <button onClick={reset} className="px-4 py-2 bg-white text-black rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors">Try again</button>
        <Link href="/traces" className="px-4 py-2 border border-white/10 text-gray-300 rounded-xl text-sm font-medium hover:border-white/20 transition-colors">All traces</Link>
      </div>
    </div>
  )
}
