'use client'

import { Terminal, TerminalOutput, TerminalHighlight } from './ui/Terminal'

const pythonCode = `from google.adk.agents import Agent
from google.adk.runners import InMemoryRunner
from watchtower import WatchtowerPlugin

agent = Agent(
    name="research_agent",
    model="gemini-2.0-flash",
    instruction="You are a research assistant.",
    tools=[search_web, write_file],
)

runner = InMemoryRunner(
    agent=agent,
    app_name="research_app",
    plugins=[WatchtowerPlugin()],  # ← Add this line
)

async for event in runner.run_async(user_id, session_id, message):
    print(event.content)`

export function CodeExample() {
  return (
    <section className="py-24 relative">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            One line to
            <br />
            <span className="gradient-text">enable tracing</span>
          </h2>
          <p className="text-xl text-muted max-w-2xl mx-auto">
            Add the plugin to your runner and traces start flowing automatically.
          </p>
        </div>

        {/* Code Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Python Code */}
          <div className="rounded-xl overflow-hidden bg-[#1a1a1a] border border-white/10">
            <div className="flex items-center gap-2 px-4 py-3 bg-[#252525] border-b border-white/10">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                <div className="w-3 h-3 rounded-full bg-[#27ca40]" />
              </div>
              <span className="text-sm text-muted ml-2 font-mono">my_agent.py</span>
            </div>
            <pre className="p-4 font-mono text-sm overflow-x-auto">
              <code>
                {pythonCode.split('\n').map((line, i) => (
                  <div key={i} className="leading-relaxed">
                    <span className="text-muted/50 select-none mr-4">{String(i + 1).padStart(2, ' ')}</span>
                    <CodeLine line={line} />
                  </div>
                ))}
              </code>
            </pre>
          </div>

          {/* Terminal Output */}
          <Terminal title="watchtower show last" className="h-full">
            <TerminalOutput>
              <div className="text-white mb-3 font-semibold">
                <TerminalHighlight color="purple">watchtower</TerminalHighlight>
                {' • Run: '}
                <TerminalHighlight color="cyan">abc123</TerminalHighlight>
                {' • 2024-01-15 14:32:01'}
              </div>

              <div className="bg-white/5 rounded-lg p-3 mb-4">
                <div className="text-xs text-muted uppercase mb-2">Summary</div>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-white font-semibold">4.2s</div>
                    <div className="text-muted text-xs">Duration</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">3</div>
                    <div className="text-muted text-xs">LLM Calls</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">5</div>
                    <div className="text-muted text-xs">Tool Calls</div>
                  </div>
                  <div>
                    <div className="text-white font-semibold">2,847</div>
                    <div className="text-muted text-xs">Tokens</div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted uppercase mb-2">Timeline</div>
              <div className="space-y-1 text-sm">
                <TimelineEvent time="14:32:01.000" icon="▶" color="green" event="run.start" />
                <TimelineEvent time="14:32:01.012" icon="→" color="cyan" event="llm.request" detail="gemini-2.0-flash" />
                <TimelineEvent time="14:32:01.847" icon="←" color="cyan" event="llm.response" detail="1,203 tokens  835ms" />
                <TimelineEvent time="14:32:01.850" icon="⚙" color="yellow" event="tool.start" detail="search_web" />
                <TimelineEvent time="14:32:02.341" icon="✓" color="green" event="tool.end" detail="search_web  491ms" />
                <TimelineEvent time="14:32:03.415" icon="■" color="purple" event="run.end" />
              </div>
            </TerminalOutput>
          </Terminal>
        </div>
      </div>
    </section>
  )
}

function CodeLine({ line }: { line: string }) {
  // Simple syntax highlighting
  const highlighted = line
    .replace(/(from|import|async|for|in|def|class|return)/g, '<keyword>$1</keyword>')
    .replace(/(WatchtowerPlugin|Agent|InMemoryRunner)/g, '<class>$1</class>')
    .replace(/(".*?")/g, '<string>$1</string>')
    .replace(/(#.*$)/g, '<comment>$1</comment>')
    .replace(/(←.*$)/g, '<comment>$1</comment>')

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: highlighted
          .replace(/<keyword>/g, '<span class="text-purple-400">')
          .replace(/<\/keyword>/g, '</span>')
          .replace(/<class>/g, '<span class="text-cyan-400">')
          .replace(/<\/class>/g, '</span>')
          .replace(/<string>/g, '<span class="text-green-400">')
          .replace(/<\/string>/g, '</span>')
          .replace(/<comment>/g, '<span class="text-muted">')
          .replace(/<\/comment>/g, '</span>')
      }}
    />
  )
}

function TimelineEvent({
  time,
  icon,
  color,
  event,
  detail,
}: {
  time: string
  icon: string
  color: 'green' | 'cyan' | 'yellow' | 'purple'
  event: string
  detail?: string
}) {
  const colors = {
    green: 'text-green-400',
    cyan: 'text-cyan-400',
    yellow: 'text-yellow-400',
    purple: 'text-purple-400',
  }

  return (
    <div className="flex gap-2">
      <span className="text-muted">{time}</span>
      <span className={colors[color]}>{icon}</span>
      <span className="text-white">{event.padEnd(15)}</span>
      {detail && <span className="text-muted">{detail}</span>}
    </div>
  )
}
