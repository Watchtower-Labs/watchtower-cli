'use client'

import { motion } from 'framer-motion'
import { Button } from './ui/Button'
import { staggerContainerSlow, slideUp, fadeIn, duration, easing } from '@/lib/motion'

/**
 * HeroSection
 *
 * Cinematic hero content with editorial typography.
 * Large serif headline, elegant subtitle, ghost + solid button pair.
 */
export function HeroSection() {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 text-center"
      variants={staggerContainerSlow}
      initial="initial"
      animate="animate"
    >
      {/* Eyebrow / Tag */}
      <motion.div
        variants={fadeIn}
        className="mb-8"
      >
        <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 border border-white/10 rounded-full bg-white/5">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          Terminal-native observability
        </span>
      </motion.div>

      {/* Main headline - Editorial serif */}
      <motion.h1
        variants={slideUp}
        className="font-serif text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white max-w-5xl"
      >
        Debug Your{' '}
        <span className="text-gradient">Agents</span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        variants={fadeIn}
        className="mt-8 text-lg sm:text-xl md:text-2xl text-gray-400 max-w-2xl leading-relaxed font-light"
      >
        View traces, tail live events, and debug Google ADK agent behavior
        without leaving your terminal.
      </motion.p>

      {/* CTA Buttons - Ghost + Solid pattern */}
      <motion.div
        variants={fadeIn}
        className="flex flex-col sm:flex-row items-center gap-4 mt-12"
      >
        <Button variant="solid" size="lg" href="/docs/quickstart">
          Get Started
        </Button>
        <Button variant="ghost" size="lg" href="https://github.com/Watchtower-Labs/watchtower-cli">
          View on GitHub
        </Button>
      </motion.div>

      {/* Install command */}
      <motion.div
        variants={fadeIn}
        className="mt-12"
      >
        <code className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-mono text-gray-400">
          pip install watchtower-adk
        </code>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-12 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: duration.emphasis, ease: easing.elegant }}
      >
        <motion.div
          className="flex flex-col items-center gap-2 text-gray-500"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
          </svg>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
