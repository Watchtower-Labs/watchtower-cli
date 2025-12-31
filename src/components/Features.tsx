'use client'

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/Card'
import { Activity, Eye, History, Terminal as TerminalIcon, Zap, Shield } from 'lucide-react'

const features = [
  {
    icon: Activity,
    title: 'Live Tailing',
    description: 'Stream events in real-time as your agent runs. See tool calls, LLM requests, and state changes as they happen.',
    command: 'watchtower tail python agent.py',
  },
  {
    icon: Eye,
    title: 'Passive Viewing',
    description: 'View past traces from saved files. Navigate through execution history with keyboard controls.',
    command: 'watchtower show last',
  },
  {
    icon: History,
    title: 'Trace History',
    description: 'List and browse all your recent traces. Filter by date, agent, or run ID.',
    command: 'watchtower list --limit 20',
  },
  {
    icon: TerminalIcon,
    title: 'Beautiful CLI',
    description: 'Rich terminal UI built with Ink. Keyboard navigation, syntax highlighting, and responsive design.',
    command: null,
  },
  {
    icon: Zap,
    title: 'Zero Config',
    description: 'Add one line to your agent and start tracing. No setup, no configuration files, no servers.',
    command: 'plugins=[WatchtowerPlugin()]',
  },
  {
    icon: Shield,
    title: 'Local First',
    description: 'All traces stored locally in ~/.watchtower. Your data never leaves your machine.',
    command: null,
  },
]

export function Features() {
  return (
    <section id="features" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Everything you need to
            <br />
            <span className="gradient-text">debug your agents</span>
          </h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            A complete observability toolkit designed for AI agent development.
            See exactly what your agent is doing.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="group">
              <CardHeader>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4 group-hover:from-primary/30 group-hover:to-accent/30 transition-colors">
                  <feature.icon className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              {feature.command && (
                <CardContent>
                  <code className="text-xs font-mono text-accent bg-white/5 px-3 py-2 rounded-lg block">
                    {feature.command}
                  </code>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
