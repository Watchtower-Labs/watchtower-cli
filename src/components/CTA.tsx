'use client'

import { Button } from './ui/Button'
import { GradientOrb } from './ui/GradientOrb'
import { ArrowRight, Github, BookOpen } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background orbs */}
      <GradientOrb position="center" size="xl" className="opacity-20" />

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
          <span className="text-sm text-muted">Free & Open Source</span>
        </div>

        {/* Headline */}
        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
          Ready to see what your
          <br />
          <span className="gradient-text">agents are doing?</span>
        </h2>

        <p className="text-xl text-muted mb-10 max-w-2xl mx-auto">
          Start tracing your Google ADK agents in minutes.
          No account required, no credit card needed.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" className="group">
            Get Started
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button variant="secondary" size="lg">
            <BookOpen className="mr-2 w-5 h-5" />
            Read the Docs
          </Button>
          <Button variant="ghost" size="lg">
            <Github className="mr-2 w-5 h-5" />
            Star on GitHub
          </Button>
        </div>

        {/* Install Command */}
        <div className="mt-12 inline-flex items-center gap-4 px-6 py-4 rounded-xl bg-white/5 border border-white/10">
          <code className="font-mono text-white">
            pip install watchtower-sdk && npm i -g watchtower-cli
          </code>
          <button
            className="text-muted hover:text-white transition-colors"
            onClick={() => navigator.clipboard.writeText('pip install watchtower-sdk && npm i -g watchtower-cli')}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
