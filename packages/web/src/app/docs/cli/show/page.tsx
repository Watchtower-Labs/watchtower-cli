import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'watchtower show - Watchtower CLI',
  description: 'View saved trace files with interactive navigation.',
}

export default function ShowCommandPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">watchtower show</h1>
      <p className="text-xl text-muted mb-8">
        View a saved trace file with interactive navigation
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Usage</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          watchtower show [trace]
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Arguments</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Argument</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
              <th className="text-left py-3 text-white font-semibold">Default</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">trace</td>
              <td className="py-3">Trace identifier (see Trace Resolution below)</td>
              <td className="py-3 font-mono">last</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Examples</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# View the most recent trace
watchtower show last

# View by run ID
watchtower show abc123

# View by full filename
watchtower show 2024-01-15_abc123

# View a specific file path
watchtower show ./my-traces/trace.jsonl
watchtower show /absolute/path/to/trace.jsonl`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Interface</h2>

      <div className="not-prose">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden font-mono text-sm">
          <div className="p-4 text-muted whitespace-pre">
{`┌─────────────────────────────────────────────────────────────┐
│ watchtower • Run: abc123 • my_agent • 2024-01-15 14:32:01  │
├─────────────────────────────────────────────────────────────┤
│ Summary                                                     │
│ Duration: 4.2s  LLM: 3  Tools: 5  Tokens: 2,847  Errors: 0 │
├─────────────────────────────────────────────────────────────┤
│ Events                                              15 total│
│ ↑ 2 more above                                             │
│   +0ms      ▶ run.start         my_agent                   │
│ > +12ms     → llm.request       gemini-2.0-flash           │
│   +847ms    ← llm.response      1,203 tokens  835ms        │
│   +850ms    ⚙ tool.start        search_web                 │
│ ↓ 8 more below                                             │
├─────────────────────────────────────────────────────────────┤
│ ↑↓/jk Navigate  Enter Expand  g/G Start/End  q Quit       │
└─────────────────────────────────────────────────────────────┘`}
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Event Detail View</h2>

      <p className="text-muted mb-4">
        Press <code className="text-primary">Enter</code> on any event to expand it:
      </p>

      <div className="not-prose">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden font-mono text-sm">
          <div className="p-4 text-muted whitespace-pre">
{`┌─────────────────────────────────────────────────────────────┐
│ Event Details                                               │
│                                                             │
│ Type:       llm.response                                   │
│ Timestamp:  2024-01-15 14:32:01.847                        │
│                                                             │
│ Request ID:    req_001                                     │
│ Duration:      835ms                                       │
│ Input Tokens:  523                                         │
│ Output Tokens: 680                                         │
│ Total Tokens:  1,203                                       │
│ Tool Calls:    Yes                                         │
│ Finish Reason: tool_calls                                  │
├─────────────────────────────────────────────────────────────┤
│ b/Esc Back  q Quit                                         │
└─────────────────────────────────────────────────────────────┘`}
          </div>
        </div>
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
              <td className="py-3 font-mono">↑ / k</td>
              <td className="py-3">Move up</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">↓ / j</td>
              <td className="py-3">Move down</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">Page Up / u</td>
              <td className="py-3">Page up</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">Page Down / d</td>
              <td className="py-3">Page down</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">g</td>
              <td className="py-3">Jump to first item</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">G</td>
              <td className="py-3">Jump to last item</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">Enter</td>
              <td className="py-3">Expand event details</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">b / Esc</td>
              <td className="py-3">Go back</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">q</td>
              <td className="py-3">Quit</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Trace Resolution</h2>

      <p className="text-muted mb-4">
        The show command accepts several formats for identifying traces:
      </p>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Format</th>
              <th className="text-left py-3 text-white font-semibold">Example</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3">Keyword</td>
              <td className="py-3 font-mono text-primary">last</td>
              <td className="py-3">Most recently modified trace</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Run ID</td>
              <td className="py-3 font-mono text-primary">abc123</td>
              <td className="py-3">Search for *_abc123.jsonl</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Filename</td>
              <td className="py-3 font-mono text-primary">2024-01-15_abc123</td>
              <td className="py-3">Date and run ID</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Path</td>
              <td className="py-3 font-mono text-primary">./traces/trace.jsonl</td>
              <td className="py-3">Relative or absolute path</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/cli/tail" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: watchtower tail →
        </a>
      </div>
    </article>
  )
}
