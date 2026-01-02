'use client'

import { Card } from './ui/Card'
import { Clock, Cpu, Lock, Plug, Code, Layers } from 'lucide-react'

const benefits = [
  {
    icon: Clock,
    title: 'Minimal Overhead',
    description: 'Less than 5% runtime impact. Built for production use with minimal performance overhead.',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'All data stays local. No cloud servers, no external APIs, no data transmission.',
  },
  {
    icon: Plug,
    title: 'Plug & Play',
    description: 'Works with existing ADK agents. No code refactoring needed, just add the plugin.',
  },
  {
    icon: Code,
    title: 'Developer Focused',
    description: 'Built by developers for developers. Terminal-native experience with vim-style navigation.',
  },
  {
    icon: Cpu,
    title: 'Lightweight',
    description: 'Small package footprint. SDK under 50KB, CLI under 5MB installed.',
  },
  {
    icon: Layers,
    title: 'Extensible',
    description: 'JSONL trace format for easy parsing. Build custom tools on top of trace data.',
  },
]

export function Benefits() {
  return (
    <section id="benefits" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Built for
            <br />
            <span className="gradient-text">production use</span>
          </h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Designed with performance, privacy, and developer experience in mind.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit) => (
            <Card key={benefit.title} className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <benefit.icon className="w-5 h-5 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  {benefit.title}
                </h3>
                <p className="text-muted text-sm">
                  {benefit.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
