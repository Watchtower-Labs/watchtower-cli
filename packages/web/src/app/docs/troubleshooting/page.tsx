import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Troubleshooting - Watchtower CLI',
  description: 'Common issues and solutions for Watchtower CLI.',
}

export default function TroubleshootingPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">Troubleshooting</h1>
      <p className="text-xl text-muted mb-8">
        Common issues and how to solve them
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">&quot;No traces found&quot;</h2>

      <p className="text-muted mb-4">
        Check that the trace directory exists:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          ls ~/.watchtower/traces/
        </pre>
      </div>

      <p className="text-muted my-4">
        Verify the SDK is writing traces:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`from watchtower import AgentTracePlugin

# Ensure the plugin is added to your agent
agent = Agent(
    plugins=[AgentTracePlugin()]
)`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">&quot;Command not found: watchtower&quot;</h2>

      <p className="text-muted mb-4">
        Verify the installation:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          npm list -g @watchtower/cli
        </pre>
      </div>

      <p className="text-muted my-4">
        Ensure your PATH includes the npm global bin directory:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# For npm
export PATH="$PATH:$(npm config get prefix)/bin"

# For pnpm
export PATH="$PATH:$(pnpm config get global-bin-dir)"`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">&quot;Process exited with code 1&quot;</h2>

      <p className="text-muted mb-4">
        The Python script failed. Check:
      </p>

      <div className="not-prose">
        <ul className="list-disc list-inside text-muted space-y-2">
          <li>Script path is correct</li>
          <li>Python executable exists</li>
          <li>Script runs successfully standalone:</li>
        </ul>
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto mt-4">
          python my_agent.py
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Events not appearing in tail</h2>

      <div className="not-prose space-y-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">1. SDK not configured for stdout</h3>
          <p className="text-muted text-sm mb-4">
            Enable stdout streaming in your plugin:
          </p>
          <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`plugin = AgentTracePlugin(
    enable_stdout=os.environ.get("AGENTTRACE_LIVE") == "1"
)`}
          </pre>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">2. Python buffering output</h3>
          <p className="text-muted text-sm">
            The CLI sets <code className="text-primary">PYTHONUNBUFFERED=1</code>, but verify your script doesn&apos;t override this.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">3. Events being filtered</h3>
          <p className="text-muted text-sm">
            Ensure events have valid <code className="text-primary">type</code>, <code className="text-primary">run_id</code>, and <code className="text-primary">timestamp</code> fields.
          </p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Display issues</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Issue</th>
              <th className="text-left py-3 text-white font-semibold">Solution</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3">Garbled characters</td>
              <td className="py-3">Ensure terminal supports Unicode</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Missing colors</td>
              <td className="py-3">Ensure terminal supports ANSI colors</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Layout broken</td>
              <td className="py-3">Ensure terminal is at least 60 columns wide</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Getting Help</h2>

      <div className="not-prose grid gap-4 md:grid-cols-2">
        <a href="https://github.com/Watchtower-Labs/watchtower-cli/issues" target="_blank" rel="noopener noreferrer" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Report a Bug →</h3>
          <p className="text-muted text-sm">Open an issue on GitHub</p>
        </a>
        <a href="https://github.com/Watchtower-Labs/watchtower-cli/discussions" target="_blank" rel="noopener noreferrer" className="block bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 hover:border-primary/50 transition-colors group">
          <h3 className="text-white font-semibold mb-2 group-hover:text-primary transition-colors">Ask a Question →</h3>
          <p className="text-muted text-sm">Start a discussion on GitHub</p>
        </a>
      </div>
    </article>
  )
}
