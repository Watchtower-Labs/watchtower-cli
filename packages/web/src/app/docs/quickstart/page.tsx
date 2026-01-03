import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quick Start - Watchtower CLI',
  description: 'Get started with Watchtower CLI in under 5 minutes.',
}

export default function QuickStartPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">Quick Start</h1>
      <p className="text-xl text-muted mb-8">
        Get up and running with Watchtower in under 5 minutes
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Step 1: Install</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# Install CLI
npm install -g @watchtower/cli

# Install Python SDK
pip install watchtower-adk`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Step 2: Add the Plugin to Your Agent</h2>

      <p className="text-muted mb-4">
        Add the <code className="text-primary">AgentTracePlugin</code> to your Google ADK agent:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`import os
from google.adk import Agent
from watchtower import AgentTracePlugin

# Create the plugin
plugin = AgentTracePlugin(
    # Enable stdout streaming for live tail
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1",
    # Use run ID from CLI if provided
    run_id=os.environ.get("AGENTTRACE_RUN_ID"),
)

# Add to your agent
agent = Agent(
    name="my_agent",
    model="gemini-2.0-flash",
    plugins=[plugin],
)

# Run your agent as normal
result = agent.run("Hello, world!")`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Step 3: Run with Live Streaming</h2>

      <p className="text-muted mb-4">
        Use <code className="text-primary">watchtower tail</code> to see events in real-time:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          watchtower tail python my_agent.py
        </pre>
      </div>

      <p className="text-muted mt-4">
        You&apos;ll see a live stream of events as your agent runs:
      </p>

      <div className="not-prose mt-4">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <span className="ml-2 text-sm text-muted">watchtower tail</span>
          </div>
          <div className="p-4 font-mono text-sm">
            <div className="text-white mb-2">
              <span className="text-purple-400">watchtower</span>
              {' • '}
              <span className="text-green-400">LIVE</span>
              {' • Run: '}
              <span className="text-cyan-400">abc123</span>
            </div>
            <div className="border-t border-white/10 my-2" />
            <div className="space-y-1 text-muted">
              <div><span className="text-white">+0ms</span>{'      '}<span className="text-green-400">▶</span>{'  run.start'}</div>
              <div><span className="text-white">+12ms</span>{'     '}<span className="text-cyan-400">→</span>{'  llm.request     gemini-2.0-flash'}</div>
              <div><span className="text-white">+847ms</span>{'    '}<span className="text-cyan-400">←</span>{'  llm.response    1,203 tokens  835ms'}</div>
              <div><span className="text-white">+850ms</span>{'    '}<span className="text-yellow-400">⚙</span>{'  tool.start      search_web'}</div>
              <div><span className="text-white">+1341ms</span>{'   '}<span className="text-green-400">✓</span>{'  tool.end        search_web     491ms'}</div>
            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Step 4: View Saved Traces</h2>

      <p className="text-muted mb-4">
        After your agent finishes, traces are automatically saved. View them with:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# View the most recent trace
watchtower show last

# List all traces
watchtower list

# View a specific trace by run ID
watchtower show abc123`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Next Steps</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2">
        <a href="/docs/cli/tail" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">watchtower tail →</h3>
          <p className="text-muted text-sm">Learn about live streaming options</p>
        </a>
        <a href="/docs/cli/show" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">watchtower show →</h3>
          <p className="text-muted text-sm">Navigate traces with keyboard shortcuts</p>
        </a>
        <a href="/docs/sdk" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Python SDK →</h3>
          <p className="text-muted text-sm">Advanced SDK configuration options</p>
        </a>
        <a href="/docs/troubleshooting" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Troubleshooting →</h3>
          <p className="text-muted text-sm">Common issues and solutions</p>
        </a>
      </div>
    </article>
  )
}
