'use client'

import { motion } from 'framer-motion'
import { fadeIn, slideUp, staggerContainer } from '@/lib/motion'

const terminalLines = [
  { type: 'prompt', content: '$ watchtower tail agent.py' },
  { type: 'info', content: '' },
  { type: 'header', content: '  Watchtower · Tailing agent.py' },
  { type: 'divider', content: '  ─────────────────────────────────────────' },
  { type: 'info', content: '' },
  { type: 'event', time: '00:00.000', icon: '▶', color: 'text-blue-400', content: 'run.start · research_agent' },
  { type: 'event', time: '00:00.012', icon: '◇', color: 'text-purple-400', content: 'llm.request · gemini-2.0-flash' },
  { type: 'event', time: '00:00.847', icon: '◆', color: 'text-purple-400', content: 'llm.response · 1,203 tokens · 835ms' },
  { type: 'event', time: '00:00.850', icon: '⚡', color: 'text-yellow-400', content: 'tool.start · search_web' },
  { type: 'event', time: '00:01.341', icon: '✓', color: 'text-green-400', content: 'tool.end · search_web · 491ms' },
  { type: 'event', time: '00:01.345', icon: '◇', color: 'text-purple-400', content: 'llm.request · gemini-2.0-flash' },
  { type: 'event', time: '00:02.101', icon: '◆', color: 'text-purple-400', content: 'llm.response · 892 tokens · 756ms' },
  { type: 'event', time: '00:02.106', icon: '■', color: 'text-blue-400', content: 'run.end · 2.1s total' },
  { type: 'info', content: '' },
  { type: 'footer', content: '  Press q to quit, ↑/↓ to navigate, Enter to expand' },
]

export function TerminalSection() {
  return (
    <section className="relative py-32 bg-black">
      <motion.div
        className="container-wide"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Section header */}
        <motion.div variants={fadeIn} className="text-center mb-16">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6">
            See Everything
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Watch your agent think in real-time. Every LLM call, every tool invocation, every state change.
          </p>
        </motion.div>

        {/* Terminal window */}
        <motion.div
          variants={slideUp}
          className="max-w-4xl mx-auto"
        >
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0a0a] shadow-2xl">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-black/50">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="flex-1 text-center text-sm text-gray-500 font-mono">
                Terminal — watchtower
              </span>
            </div>

            {/* Terminal content */}
            <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
              {terminalLines.map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  viewport={{ once: true }}
                  className="whitespace-pre"
                >
                  {line.type === 'prompt' && (
                    <span className="text-gray-300">{line.content}</span>
                  )}
                  {line.type === 'header' && (
                    <span className="text-white font-medium">{line.content}</span>
                  )}
                  {line.type === 'divider' && (
                    <span className="text-gray-700">{line.content}</span>
                  )}
                  {line.type === 'event' && (
                    <span>
                      <span className="text-gray-600">  {line.time}</span>
                      <span className={`${line.color} mx-2`}>{line.icon}</span>
                      <span className="text-gray-300">{line.content}</span>
                    </span>
                  )}
                  {line.type === 'footer' && (
                    <span className="text-gray-600">{line.content}</span>
                  )}
                  {line.type === 'info' && <span>&nbsp;</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  )
}
