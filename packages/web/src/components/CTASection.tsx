'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeIn, staggerContainerSlow } from '@/lib/motion'
import { Button } from './ui/Button'

export function CTASection() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText('pip install watchtower-adk')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }
  return (
    <section className="relative py-32 bg-black overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-radial from-purple-500/10 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <motion.div
        className="container-tight relative z-10 text-center"
        variants={staggerContainerSlow}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        <motion.h2
          variants={fadeIn}
          className="font-serif text-4xl sm:text-5xl md:text-6xl font-medium tracking-tight text-white mb-6"
        >
          Start Debugging
        </motion.h2>

        <motion.p
          variants={fadeIn}
          className="text-lg sm:text-xl text-gray-400 max-w-xl mx-auto mb-12"
        >
          Install the SDK and get full observability for your Google ADK agents in seconds.
        </motion.p>

        {/* Install command - large and prominent */}
        <motion.div
          variants={fadeIn}
          className="mb-12"
        >
          <div className="inline-flex items-center gap-4 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl">
            <span className="text-gray-500 font-mono">$</span>
            <code className="text-lg font-mono text-white">pip install watchtower-adk</code>
            <motion.button
              className="text-gray-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopy}
              title="Copy to clipboard"
              aria-label="Copy install command to clipboard"
            >
              {copied ? (
                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          variants={fadeIn}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="solid" size="lg" href="/docs/quickstart">
            Get Started
          </Button>
          <Button variant="ghost" size="lg" href="https://github.com/Watchtower-Labs/watchtower-cli">
            View on GitHub
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
