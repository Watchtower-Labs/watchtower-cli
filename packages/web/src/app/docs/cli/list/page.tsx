import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'watchtower list - Watchtower CLI',
  description: 'List and browse recent trace files.',
}

export default function ListCommandPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">watchtower list</h1>
      <p className="text-xl text-muted mb-8">
        List and browse recent trace files
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Usage</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          watchtower list [options]
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Options</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Option</th>
              <th className="text-left py-3 text-white font-semibold">Alias</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
              <th className="text-left py-3 text-white font-semibold">Default</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">--limit</td>
              <td className="py-3 font-mono">-n</td>
              <td className="py-3">Number of traces to show</td>
              <td className="py-3 font-mono">10</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">--since</td>
              <td className="py-3">-</td>
              <td className="py-3">Filter by date (YYYY-MM-DD)</td>
              <td className="py-3">-</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Examples</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# List last 10 traces
watchtower list

# List last 50 traces
watchtower list --limit 50
watchtower list -n 50

# Filter by date
watchtower list --since 2024-01-10`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Interface</h2>

      <div className="not-prose">
        <div className="bg-[#1a1a2e] border border-white/10 rounded-xl overflow-hidden font-mono text-sm">
          <div className="p-4 text-muted whitespace-pre">
{`┌──────────────────────────────────────────────────────────────┐
│ Recent Traces                                    10 traces   │
├──────────────────────────────────────────────────────────────┤
│ RUN ID    DATE        SIZE      AGE                         │
│ abc123    2024-01-15  12.3 KB   2 hours ago                 │
│ def456    2024-01-15   8.7 KB   5 hours ago                 │
│ ghi789    2024-01-14  24.1 KB   1 day ago                   │
│ jkl012    2024-01-14   3.2 KB   1 day ago                   │
│ mno345    2024-01-13  15.8 KB   2 days ago                  │
├──────────────────────────────────────────────────────────────┤
│ ↑↓/jk Navigate  Enter View  q Quit                          │
└──────────────────────────────────────────────────────────────┘`}
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
              <td className="py-3 font-mono">Enter</td>
              <td className="py-3">Open selected trace in show view</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">↑ / k</td>
              <td className="py-3">Move selection up</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">↓ / j</td>
              <td className="py-3">Move selection down</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono">q</td>
              <td className="py-3">Quit</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Trace Storage</h2>

      <p className="text-muted mb-4">
        Traces are stored by default in:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          ~/.watchtower/traces/
        </pre>
      </div>

      <p className="text-muted mt-4">
        This can be overridden by setting the <code className="text-primary">WATCHTOWER_TRACE_DIR</code> environment variable.
      </p>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/cli/config" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: watchtower config →
        </a>
      </div>
    </article>
  )
}
