import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'watchtower tail - Watchtower CLI',
  description: 'Run a Python script and stream events in real-time.',
}

export default function TailCommandPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">watchtower tail</h1>
      <p className="text-xl text-muted mb-8">
        Run a Python script and stream events in real-time
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Usage</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          {'watchtower tail <script...>'}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Arguments</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Argument</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">script</td>
              <td className="py-3">Command and arguments to run</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Examples</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# Basic usage
watchtower tail python my_agent.py

# With script arguments (use -- to separate)
watchtower tail -- python my_agent.py --verbose

# With multiple arguments
watchtower tail -- python my_agent.py --config prod.yaml --user alice`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Environment Variables</h2>

      <p className="text-muted mb-4">
        The CLI automatically sets these environment variables for the spawned process:
      </p>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Variable</th>
              <th className="text-left py-3 text-white font-semibold">Value</th>
              <th className="text-left py-3 text-white font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">PYTHONUNBUFFERED</td>
              <td className="py-3 font-mono">1</td>
              <td className="py-3">Disable Python output buffering</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">WATCHTOWER_LIVE</td>
              <td className="py-3 font-mono">1</td>
              <td className="py-3">Signal SDK to enable stdout streaming</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">WATCHTOWER_RUN_ID</td>
              <td className="py-3 font-mono">{'<uuid>'}</td>
              <td className="py-3">Unique run identifier</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Interface</h2>

      <div className="not-prose">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden font-mono text-sm">
          <div className="p-4 text-muted whitespace-pre">
{`┌─────────────────────────────────────────────────────────────┐
│ watchtower • LIVE • Run: xyz789                    ● REC   │
├─────────────────────────────────────────────────────────────┤
│ Stats                                                       │
│ Duration: 1.2s  LLM: 1  Tools: 2  Tokens: 847  Errors: 0   │
├─────────────────────────────────────────────────────────────┤
│ Events                                              4 events│
│ +0ms      ▶ run.start         research_agent               │
│ +12ms     → llm.request       gemini-2.0-flash             │
│ +847ms    ← llm.response      847 tokens  835ms            │
│ +850ms    ⚙ tool.start        search_web                   │
│                                                             │
│ Waiting for events...                                       │
├─────────────────────────────────────────────────────────────┤
│ Ctrl+C Stop  p Pause  q Quit                               │
└─────────────────────────────────────────────────────────────┘`}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">SDK Integration</h2>

      <p className="text-muted mb-4">
        Your Python script must enable stdout streaming to work with <code className="text-primary">tail</code>:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`import os
from watchtower import AgentTracePlugin

plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("WATCHTOWER_LIVE") == "1",
    run_id=os.environ.get("WATCHTOWER_RUN_ID"),
)`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Keyboard Shortcuts</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Key</th>
              <th className="text-left py-3 text-white font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">p</td>
              <td className="py-3">Pause / Resume streaming</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">Ctrl+C</td>
              <td className="py-3">Stop the running process</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">q</td>
              <td className="py-3">Quit</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/cli/list" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: watchtower list →
        </a>
      </div>
    </article>
  )
}
