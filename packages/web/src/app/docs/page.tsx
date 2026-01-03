import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Documentation - Watchtower CLI',
  description: 'Learn how to use Watchtower CLI for terminal-based observability of your Google ADK agents.',
}

export default function DocsPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">Watchtower CLI</h1>
      <p className="text-xl text-muted mb-8">
        Terminal-based observability for Google ADK agents
      </p>

      <div className="not-prose bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">What is Watchtower?</h2>
        <p className="text-muted">
          Watchtower is an open-source CLI tool that lets you view agent activity, tool calls,
          LLM interactions, and execution history directly in your terminal. It provides
          zero-config setup for Google ADK agents.
        </p>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Features</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-2xl mb-3">📺</div>
          <h3 className="text-white font-semibold mb-2">Live Streaming</h3>
          <p className="text-muted text-sm">
            Watch agent events in real-time as they happen with <code className="text-primary">watchtower tail</code>
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-2xl mb-3">🔍</div>
          <h3 className="text-white font-semibold mb-2">Trace Viewer</h3>
          <p className="text-muted text-sm">
            Navigate saved traces with drill-down detail using <code className="text-primary">watchtower show</code>
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-2xl mb-3">📋</div>
          <h3 className="text-white font-semibold mb-2">Trace History</h3>
          <p className="text-muted text-sm">
            Browse and select from recent traces with <code className="text-primary">watchtower list</code>
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <div className="text-2xl mb-3">⚡</div>
          <h3 className="text-white font-semibold mb-2">Vim-style Navigation</h3>
          <p className="text-muted text-sm">
            Navigate with familiar keyboard shortcuts: j/k, g/G, and arrow keys
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Quick Install</h2>

      <div className="not-prose">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-sm text-muted">Terminal</span>
          </div>
          <div className="p-4 font-mono text-sm">
            <div className="text-muted mb-2"># Install the CLI globally</div>
            <div className="text-white">npm install -g @watchtower/cli</div>
            <div className="text-muted mt-4 mb-2"># Or with pnpm</div>
            <div className="text-white">pnpm add -g @watchtower/cli</div>
            <div className="text-muted mt-4 mb-2"># Install the Python SDK</div>
            <div className="text-white">pip install watchtower-adk</div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Next Steps</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2">
        <a href="/docs/installation" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Installation →</h3>
          <p className="text-muted text-sm">Detailed installation instructions for all package managers</p>
        </a>
        <a href="/docs/quickstart" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Quick Start →</h3>
          <p className="text-muted text-sm">Get up and running in under 5 minutes</p>
        </a>
        <a href="/docs/cli/show" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">CLI Reference →</h3>
          <p className="text-muted text-sm">Complete documentation for all CLI commands</p>
        </a>
        <a href="/docs/sdk" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Python SDK →</h3>
          <p className="text-muted text-sm">Integrate tracing into your ADK agents</p>
        </a>
      </div>
    </article>
  )
}
