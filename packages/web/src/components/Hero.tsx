'use client'

import { Button } from './ui/Button'
import { GradientOrb } from './ui/GradientOrb'
import { Terminal, TerminalLine, TerminalOutput, TerminalHighlight } from './ui/Terminal'
import { ArrowRight, Github } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Gradient Orbs */}
      <GradientOrb position="top-left" size="lg" />
      <GradientOrb position="bottom-right" size="lg" delay={2} />
      <GradientOrb position="center" size="md" delay={1} className="opacity-30" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-muted">Open Source & Free</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Terminal-based
            <br />
            <span className="gradient-text">observability</span>
            <br />
            for AI agents
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-muted max-w-2xl mx-auto mb-10">
            View agent activity, tool calls, LLM interactions, and execution history
            through your terminal. Zero-config setup for Google ADK.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="group" href="/docs/quickstart">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="secondary" size="lg" href="https://github.com/Watchtower-Labs/watchtower-cli">
              <Github className="mr-2 w-5 h-5" />
              View on GitHub
            </Button>
          </div>
        </div>

        {/* Terminal Preview */}
        <div className="max-w-4xl mx-auto mt-16">
          <Terminal title="watchtower tail python agent.py" className="glow">
            <div className="space-y-2">
              <TerminalLine>watchtower tail python my_agent.py</TerminalLine>
              <TerminalOutput className="mt-4">
                <div className="text-white mb-2">
                  <TerminalHighlight color="purple">watchtower</TerminalHighlight>
                  {' • '}
                  <TerminalHighlight color="green">LIVE</TerminalHighlight>
                  {' • Run: '}
                  <TerminalHighlight color="cyan">abc123</TerminalHighlight>
                </div>
                <div className="border-t border-white/10 my-2" />
                <div className="space-y-1 text-sm">
                  <div>
                    <TerminalHighlight color="white">14:32:01.000</TerminalHighlight>
                    {'  '}
                    <TerminalHighlight color="green">▶</TerminalHighlight>
                    {'  run.start'}
                  </div>
                  <div>
                    <TerminalHighlight color="white">14:32:01.012</TerminalHighlight>
                    {'  '}
                    <TerminalHighlight color="cyan">→</TerminalHighlight>
                    {'  llm.request     gemini-2.0-flash'}
                  </div>
                  <div>
                    <TerminalHighlight color="white">14:32:01.847</TerminalHighlight>
                    {'  '}
                    <TerminalHighlight color="cyan">←</TerminalHighlight>
                    {'  llm.response    1,203 tokens  835ms'}
                  </div>
                  <div>
                    <TerminalHighlight color="white">14:32:01.850</TerminalHighlight>
                    {'  '}
                    <TerminalHighlight color="yellow">⚙</TerminalHighlight>
                    {'  tool.start      search_web'}
                  </div>
                  <div>
                    <TerminalHighlight color="white">14:32:02.341</TerminalHighlight>
                    {'  '}
                    <TerminalHighlight color="green">✓</TerminalHighlight>
                    {'  tool.end        search_web     491ms'}
                  </div>
                </div>
                <div className="mt-3 text-yellow-400 animate-pulse">
                  ░░░░░ Running...
                </div>
              </TerminalOutput>
            </div>
          </Terminal>
        </div>
      </div>
    </section>
  )
}
