'use client'

import { ReactNode } from 'react'

interface TerminalProps {
  children: ReactNode
  title?: string
  className?: string
}

export function Terminal({ children, title = 'Terminal', className = '' }: TerminalProps) {
  return (
    <div className={`rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10 ${className}`}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
          <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
          <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
        </div>
        <span className="text-sm text-muted ml-2 font-mono">{title}</span>
      </div>
      {/* Content */}
      <div className="p-4 font-mono text-sm overflow-x-auto">
        {children}
      </div>
    </div>
  )
}

interface TerminalLineProps {
  children: ReactNode
  prompt?: string
  className?: string
}

export function TerminalLine({ children, prompt = '$', className = '' }: TerminalLineProps) {
  return (
    <div className={`flex gap-2 ${className}`}>
      <span className="text-accent select-none">{prompt}</span>
      <span className="text-white">{children}</span>
    </div>
  )
}

interface TerminalOutputProps {
  children: ReactNode
  className?: string
}

export function TerminalOutput({ children, className = '' }: TerminalOutputProps) {
  return (
    <div className={`text-muted ${className}`}>
      {children}
    </div>
  )
}

interface TerminalHighlightProps {
  children: ReactNode
  color?: 'green' | 'yellow' | 'cyan' | 'red' | 'purple' | 'white'
}

export function TerminalHighlight({ children, color = 'green' }: TerminalHighlightProps) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    cyan: 'text-cyan-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    white: 'text-white',
  }

  return <span className={colors[color]}>{children}</span>
}
