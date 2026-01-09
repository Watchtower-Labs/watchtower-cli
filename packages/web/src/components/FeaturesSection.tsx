'use client'

import { motion } from 'framer-motion'
import { staggerContainer, fadeIn, slideUp } from '@/lib/motion'

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    title: 'watchtower show',
    description: 'Inspect any trace with full detail. Drill down into LLM calls, tool invocations, and state changes.',
    command: 'watchtower show abc123',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'watchtower tail',
    description: 'Stream events in real-time as your agent runs. Watch LLM requests, tool calls, and state changes live.',
    command: 'watchtower tail agent.py',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
    title: 'watchtower list',
    description: 'Browse all saved traces. Filter by agent, date, or status. Jump into any trace with one keystroke.',
    command: 'watchtower list --limit 20',
  },
]

export function FeaturesSection() {
  return (
    <section className="relative py-32 bg-black">
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <motion.div
        className="container-wide"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Section header */}
        <motion.div variants={fadeIn} className="text-center mb-20">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6">
            Terminal-First
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Three commands. Full observability. No context switching.
          </p>
        </motion.div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={slideUp}
              className="group relative"
            >
              <div className="glass-card h-full hover:border-white/20 transition-all duration-300">
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-6 group-hover:text-white group-hover:border-white/20 transition-all duration-300">
                  {feature.icon}
                </div>

                {/* Title */}
                <h3 className="font-mono text-lg text-white mb-3">
                  {feature.title}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-sm leading-relaxed mb-6">
                  {feature.description}
                </p>

                {/* Command preview */}
                <div className="mt-auto">
                  <code className="text-xs font-mono text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                    $ {feature.command}
                  </code>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
