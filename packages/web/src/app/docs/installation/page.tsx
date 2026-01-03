import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Installation - Watchtower CLI',
  description: 'Install Watchtower CLI and Python SDK for Google ADK agent observability.',
}

export default function InstallationPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">Installation</h1>
      <p className="text-xl text-muted mb-8">
        Install the CLI and SDK to start tracing your agents
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">CLI Installation</h2>

      <p className="text-muted mb-4">
        The Watchtower CLI is a Node.js package that can be installed globally using your preferred package manager.
      </p>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">npm</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          npm install -g @watchtower/cli
        </pre>
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">pnpm</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          pnpm add -g @watchtower/cli
        </pre>
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">yarn</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          yarn global add @watchtower/cli
        </pre>
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">Verify Installation</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`watchtower --version
watchtower --help`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Python SDK Installation</h2>

      <p className="text-muted mb-4">
        The Python SDK provides the <code className="text-primary">AgentTracePlugin</code> that integrates with Google ADK to emit trace events.
      </p>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">pip</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          pip install watchtower-adk
        </pre>
      </div>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">With optional dependencies</h3>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          pip install watchtower-adk[dev]
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Requirements</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Component</th>
              <th className="text-left py-3 text-white font-semibold">Requirement</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3">CLI</td>
              <td className="py-3">Node.js 18+</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Python SDK</td>
              <td className="py-3">Python 3.9+</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3">Google ADK</td>
              <td className="py-3">google-adk 0.1.0+</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Troubleshooting</h2>

      <h3 className="text-xl font-semibold text-white mt-8 mb-4">&quot;Command not found: watchtower&quot;</h3>
      <p className="text-muted mb-4">
        Ensure your npm global bin directory is in your PATH:
      </p>
      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# For npm
export PATH="$PATH:$(npm config get prefix)/bin"

# For pnpm
export PATH="$PATH:$(pnpm config get global-bin-dir)"`}
        </pre>
      </div>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/quickstart" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: Quick Start →
        </a>
      </div>
    </article>
  )
}
