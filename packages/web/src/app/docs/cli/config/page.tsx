import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'watchtower config - Watchtower CLI',
  description: 'View and manage CLI configuration.',
}

export default function ConfigCommandPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">watchtower config</h1>
      <p className="text-xl text-muted mb-8">
        View and manage CLI configuration
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Usage</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          watchtower config [options]
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Options</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Option</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">--init</td>
              <td className="py-3">Create default config file if it doesn&apos;t exist</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">{'--set <key=value>'}</td>
              <td className="py-3">Set a configuration value</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Examples</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# Show current configuration
watchtower config

# Initialize default config
watchtower config --init

# Set configuration values
watchtower config --set theme=light
watchtower config --set timestampFormat=absolute
watchtower config --set maxEvents=500
watchtower config --set defaultPython=/usr/bin/python3`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Configuration Keys</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Key</th>
              <th className="text-left py-3 text-white font-semibold">Type</th>
              <th className="text-left py-3 text-white font-semibold">Values</th>
              <th className="text-left py-3 text-white font-semibold">Default</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">theme</td>
              <td className="py-3">string</td>
              <td className="py-3 font-mono">dark, light, minimal</td>
              <td className="py-3 font-mono">dark</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">maxEvents</td>
              <td className="py-3">number</td>
              <td className="py-3">Any positive integer</td>
              <td className="py-3 font-mono">1000</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">timestampFormat</td>
              <td className="py-3">string</td>
              <td className="py-3 font-mono">relative, absolute, unix</td>
              <td className="py-3 font-mono">relative</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">defaultPython</td>
              <td className="py-3">string</td>
              <td className="py-3">Path to Python</td>
              <td className="py-3 font-mono">python3</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Config File</h2>

      <p className="text-muted mb-4">
        Configuration is stored in:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          ~/.watchtower/cli.yaml
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Config File Format</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`# Theme: dark, light, or minimal
theme: dark

# Maximum events to display in show command
maxEvents: 1000

# Timestamp format: relative (+123ms), absolute (14:32:01.000), or unix
timestampFormat: relative

# Python executable for tail command
defaultPython: python3`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Themes</h2>

      <div className="not-prose grid gap-4 md:grid-cols-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Dark (Default)</h3>
          <p className="text-muted text-sm">
            Optimized for dark terminal backgrounds. Uses bright colors for visibility.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Light</h3>
          <p className="text-muted text-sm">
            Optimized for light terminal backgrounds. Uses darker colors for contrast.
          </p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2">Minimal</h3>
          <p className="text-muted text-sm">
            Reduced color palette for limited terminal support or accessibility.
          </p>
        </div>
      </div>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/sdk" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: Python SDK →
        </a>
      </div>
    </article>
  )
}
