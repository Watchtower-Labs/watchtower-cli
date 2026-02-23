'use client'

import { motion } from 'framer-motion'
import { staggerContainer, fadeIn, slideUp } from '@/lib/motion'

const steps = [
  {
    number: '01',
    title: 'Install the SDK',
    description: 'Add watchtower-adk to your Python project. One import, zero configuration.',
    code: 'pip install watchtower-adk',
  },
  {
    number: '02',
    title: 'Instrument Your Agent',
    description: 'Import the plugin and add it to your ADK agent. Tracing starts automatically.',
    code: 'from watchtower import WatchtowerPlugin',
  },
  {
    number: '03',
    title: 'Run Your Agent',
    description: 'Execute your agent normally. Watchtower captures every event to disk.',
    code: 'python my_agent.py',
  },
  {
    number: '04',
    title: 'Explore Traces',
    description: 'Use the CLI to view, search, and analyze your agent traces.',
    code: 'watchtower list',
  },
]

export function HowItWorksSection() {
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-radial from-purple-500/5 via-transparent to-transparent pointer-events-none" />

      <motion.div
        className="container-wide relative z-10"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        {/* Section header */}
        <motion.div variants={fadeIn} className="text-center mb-20">
          <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6">
            How It Works
          </h2>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto">
            Get from zero to full observability in under a minute.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="absolute left-[39px] top-0 bottom-0 w-px bg-gradient-to-b from-white/20 via-white/10 to-transparent hidden md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={slideUp}
              className="relative flex gap-8 mb-16 last:mb-0"
            >
              {/* Step number */}
              <div className="flex-shrink-0 w-20 hidden md:block">
                <div className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative z-10">
                  <span className="font-mono text-2xl text-white/60">{step.number}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 glass-card">
                <span className="font-mono text-sm text-purple-400 mb-2 block md:hidden">
                  Step {step.number}
                </span>
                <h3 className="font-serif text-2xl text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-400 mb-4">
                  {step.description}
                </p>
                <code className="inline-block text-sm font-mono text-gray-300 bg-black/50 px-4 py-2 rounded-lg border border-white/5">
                  $ {step.code}
                </code>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
