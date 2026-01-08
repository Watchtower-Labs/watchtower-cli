'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function InstallCTA() {
  const [copied, setCopied] = useState(false)
  const installCommand = 'pip install watchtower-adk'

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(installCommand)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = installCommand
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section className="py-20 md:py-28 bg-graphite-950">
      <div className="container-tight text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">
          Get started in seconds.
        </h2>
        <p className="text-graphite-400 mb-10 max-w-lg mx-auto">
          One command to install. One line to integrate. Zero configuration required.
        </p>

        {/* Install command */}
        <div className="inline-flex items-center bg-graphite-900 border border-graphite-700 mb-8">
          <code className="px-6 py-4 font-mono text-sm md:text-base text-graphite-100">
            <span className="text-graphite-500">$ </span>
            {installCommand}
          </code>
          <button
            onClick={copyToClipboard}
            className="px-4 py-4 border-l border-graphite-700 text-graphite-400 hover:text-white hover:bg-graphite-800 transition-colors"
            aria-label="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-signal" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Integration example */}
        <div className="max-w-xl mx-auto bg-graphite-900 border border-graphite-700 text-left">
          <div className="px-4 py-2 border-b border-graphite-700 text-xs text-graphite-500 font-mono">
            agent.py
          </div>
          <pre className="p-4 font-mono text-sm overflow-x-auto">
            <code>
              <span className="text-terminal-purple">from</span>
              <span className="text-terminal-text"> watchtower </span>
              <span className="text-terminal-purple">import</span>
              <span className="text-terminal-text"> AgentTracePlugin</span>
              {'\n\n'}
              <span className="text-terminal-text">runner = InMemoryRunner(</span>
              {'\n'}
              <span className="text-terminal-text">    agent=my_agent,</span>
              {'\n'}
              <span className="text-terminal-text">    plugins=[</span>
              <span className="text-terminal-cyan">AgentTracePlugin()</span>
              <span className="text-terminal-text">]</span>
              {'\n'}
              <span className="text-terminal-text">)</span>
            </code>
          </pre>
        </div>
      </div>
    </section>
  )
}
