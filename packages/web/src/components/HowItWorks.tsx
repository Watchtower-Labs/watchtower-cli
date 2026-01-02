'use client'

import { Card } from './ui/Card'

const steps = [
  {
    number: '01',
    title: 'Install the SDK',
    description: 'Add the watchtower package to your Python project with pip.',
    code: 'pip install watchtower-sdk',
  },
  {
    number: '02',
    title: 'Add the plugin',
    description: 'Import and add WatchtowerPlugin to your ADK runner with one line.',
    code: 'plugins=[WatchtowerPlugin()]',
  },
  {
    number: '03',
    title: 'Run your agent',
    description: 'Execute your agent as normal. Traces are automatically saved to disk.',
    code: 'python my_agent.py',
  },
  {
    number: '04',
    title: 'View traces',
    description: 'Use the CLI to view traces live or explore past executions.',
    code: 'watchtower show last',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 relative bg-gradient-to-b from-transparent via-primary/5 to-transparent">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Get started in
            <br />
            <span className="gradient-text">under 5 minutes</span>
          </h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            From installation to viewing your first trace. No complex configuration required.
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <Card key={step.number} hover={false} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary to-accent" />
              )}

              {/* Step number */}
              <div className="text-6xl font-bold gradient-text opacity-20 mb-4">
                {step.number}
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-muted text-sm mb-4">
                {step.description}
              </p>

              {/* Code */}
              <code className="text-xs font-mono text-accent bg-black/30 px-3 py-2 rounded-lg block">
                {step.code}
              </code>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
