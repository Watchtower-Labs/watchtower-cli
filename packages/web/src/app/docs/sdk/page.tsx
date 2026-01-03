import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Python SDK - Watchtower CLI',
  description: 'Integrate Watchtower tracing into your Google ADK agents.',
}

export default function SDKPage() {
  return (
    <article className="prose prose-invert max-w-none">
      <h1 className="text-4xl font-bold text-white mb-4">Python SDK</h1>
      <p className="text-xl text-muted mb-8">
        Integrate tracing into your Google ADK agents
      </p>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Installation</h2>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
          pip install watchtower-adk
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Quick Start</h2>

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

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">AgentTracePlugin</h2>

      <p className="text-muted mb-4">
        The main class for integrating with Google ADK:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`from watchtower import AgentTracePlugin

plugin = AgentTracePlugin(
    # Enable writing to stdout (for live streaming)
    enable_stdout: bool = False,

    # Enable writing to file
    enable_file: bool = True,

    # Custom run ID (auto-generated if not provided)
    run_id: str | None = None,

    # Custom output directory
    output_dir: str | None = None,  # Default: ~/.watchtower/traces

    # Fields to sanitize from events
    sanitize_fields: list[str] = ["api_key", "password", "secret"],
)`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Configuration Options</h2>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Option</th>
              <th className="text-left py-3 text-white font-semibold">Type</th>
              <th className="text-left py-3 text-white font-semibold">Default</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">enable_stdout</td>
              <td className="py-3">bool</td>
              <td className="py-3 font-mono">False</td>
              <td className="py-3">Write events to stdout for live streaming</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">enable_file</td>
              <td className="py-3">bool</td>
              <td className="py-3 font-mono">True</td>
              <td className="py-3">Write events to trace file</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">run_id</td>
              <td className="py-3">str | None</td>
              <td className="py-3 font-mono">None</td>
              <td className="py-3">Custom run identifier</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">output_dir</td>
              <td className="py-3">str | None</td>
              <td className="py-3 font-mono">~/.watchtower/traces</td>
              <td className="py-3">Directory for trace files</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">sanitize_fields</td>
              <td className="py-3">list[str]</td>
              <td className="py-3 font-mono">[&quot;api_key&quot;, ...]</td>
              <td className="py-3">Fields to redact from events</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Environment Variables</h2>

      <p className="text-muted mb-4">
        The SDK respects these environment variables:
      </p>

      <div className="not-prose">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 text-white font-semibold">Variable</th>
              <th className="text-left py-3 text-white font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="text-muted">
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">AGENTTRACE_LIVE</td>
              <td className="py-3">Set to &quot;1&quot; to enable stdout streaming</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">AGENTTRACE_RUN_ID</td>
              <td className="py-3">Override the run ID</td>
            </tr>
            <tr className="border-b border-white/10">
              <td className="py-3 font-mono text-primary">AGENTTRACE_DIR</td>
              <td className="py-3">Override the trace output directory</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Event Types</h2>

      <p className="text-muted mb-4">
        The SDK emits the following event types:
      </p>

      <div className="not-prose grid gap-4 md:grid-cols-2">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">run.start</h3>
          <p className="text-muted text-sm">Agent execution started</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">run.end</h3>
          <p className="text-muted text-sm">Agent execution completed</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">llm.request</h3>
          <p className="text-muted text-sm">LLM API call initiated</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">llm.response</h3>
          <p className="text-muted text-sm">LLM API response received</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">tool.start</h3>
          <p className="text-muted text-sm">Tool execution started</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">tool.end</h3>
          <p className="text-muted text-sm">Tool execution completed</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <h3 className="text-white font-semibold mb-2 font-mono text-sm">error</h3>
          <p className="text-muted text-sm">Error occurred during execution</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Trace File Format</h2>

      <p className="text-muted mb-4">
        Traces are stored as JSONL (newline-delimited JSON) files:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`{"type":"run.start","run_id":"abc123","timestamp":1705329121000,"agent":"my_agent"}
{"type":"llm.request","run_id":"abc123","timestamp":1705329121012,"model":"gemini-2.0-flash"}
{"type":"llm.response","run_id":"abc123","timestamp":1705329121847,"tokens":1203,"duration_ms":835}
{"type":"run.end","run_id":"abc123","timestamp":1705329125234,"success":true}`}
        </pre>
      </div>

      <h2 className="text-2xl font-bold text-white mt-12 mb-6">Security</h2>

      <p className="text-muted mb-4">
        The SDK automatically sanitizes sensitive fields from trace events. You can customize which fields are sanitized:
      </p>

      <div className="not-prose">
        <pre className="bg-[#1a1a2e] border border-white/10 rounded-xl p-4 font-mono text-sm text-white overflow-x-auto">
{`plugin = AgentTracePlugin(
    sanitize_fields=[
        "api_key",
        "password",
        "secret",
        "token",
        "authorization",
        "my_custom_secret_field",
    ],
)`}
        </pre>
      </div>

      <div className="not-prose mt-12 flex gap-4">
        <a href="/docs/troubleshooting" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-full font-medium hover:opacity-90 transition-opacity">
          Next: Troubleshooting →
        </a>
      </div>
    </article>
  )
}
