'use client'

export function TerminalPreview() {
  return (
    <section className="py-16 md:py-24">
      <div className="container-wide">
        <div className="grid md:grid-cols-2 gap-12 items-start">
          {/* Left: Description */}
          <div className="pt-4">
            <h2 className="text-2xl md:text-3xl font-bold text-graphite-950 mb-4 tracking-tight">
              Real output. Real control.
            </h2>
            <p className="text-graphite-500 mb-6 leading-relaxed">
              Watchtower streams events directly to your terminal. Every tool call,
              every LLM request, every state change—visible as it happens. No dashboards
              to configure, no browsers to open.
            </p>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-signal mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-graphite-700">Live tailing</div>
                  <div className="text-sm text-graphite-400">Stream events as your agent runs</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-graphite-700">Trace replay</div>
                  <div className="text-sm text-graphite-400">Review past runs with full context</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-amber mt-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-graphite-700">Keyboard navigation</div>
                  <div className="text-sm text-graphite-400">vim-style controls, zero mouse required</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Terminal */}
          <div className="bg-terminal-bg border border-terminal-border overflow-hidden font-mono text-sm">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-terminal-surface border-b border-terminal-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-terminal-red opacity-80" />
                <div className="w-3 h-3 rounded-full bg-terminal-yellow opacity-80" />
                <div className="w-3 h-3 rounded-full bg-terminal-green opacity-80" />
              </div>
              <span className="text-terminal-comment text-xs ml-2">watchtower tail python agent.py</span>
            </div>

            {/* Terminal content */}
            <div className="p-4 code-block overflow-x-auto">
              {/* Command prompt */}
              <div className="flex items-center gap-2 mb-4">
                <span className="text-terminal-green">$</span>
                <span className="text-terminal-text">watchtower tail python my_agent.py</span>
              </div>

              {/* Output header */}
              <div className="text-terminal-text mb-3">
                <span className="text-terminal-purple font-semibold">watchtower</span>
                <span className="text-terminal-comment"> · </span>
                <span className="text-terminal-green">LIVE</span>
                <span className="text-terminal-comment"> · Run: </span>
                <span className="text-terminal-cyan">d2e6f0</span>
              </div>

              {/* Separator */}
              <div className="border-t border-terminal-border my-3" />

              {/* Event stream */}
              <div className="space-y-1.5 text-xs">
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+0ms</span>
                  <span className="text-terminal-green mr-3">▶</span>
                  <span className="text-terminal-text w-28">run.start</span>
                  <span className="text-terminal-comment">research_assistant</span>
                </div>
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+12ms</span>
                  <span className="text-terminal-cyan mr-3">→</span>
                  <span className="text-terminal-text w-28">llm.request</span>
                  <span className="text-terminal-comment">gemini-2.0-flash</span>
                </div>
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+847ms</span>
                  <span className="text-terminal-cyan mr-3">←</span>
                  <span className="text-terminal-text w-28">llm.response</span>
                  <span className="text-terminal-comment">1,203 tokens</span>
                  <span className="text-terminal-yellow ml-2">835ms</span>
                </div>
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+850ms</span>
                  <span className="text-terminal-yellow mr-3">⚙</span>
                  <span className="text-terminal-text w-28">tool.start</span>
                  <span className="text-terminal-purple">search_web</span>
                </div>
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+1,341ms</span>
                  <span className="text-terminal-green mr-3">✓</span>
                  <span className="text-terminal-text w-28">tool.end</span>
                  <span className="text-terminal-purple">search_web</span>
                  <span className="text-terminal-yellow ml-2">491ms</span>
                </div>
                <div className="flex">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+1,345ms</span>
                  <span className="text-terminal-cyan mr-3">→</span>
                  <span className="text-terminal-text w-28">llm.request</span>
                  <span className="text-terminal-comment">gemini-2.0-flash</span>
                </div>
                <div className="flex items-center">
                  <span className="text-terminal-comment w-24 flex-shrink-0">+2,156ms</span>
                  <span className="text-terminal-cyan mr-3">←</span>
                  <span className="text-terminal-text w-28">llm.response</span>
                  <span className="text-terminal-comment">847 tokens</span>
                  <span className="text-terminal-yellow ml-2">811ms</span>
                </div>
              </div>

              {/* Running indicator */}
              <div className="mt-4 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
                <span className="text-terminal-comment text-xs">Running...</span>
              </div>

              {/* Summary */}
              <div className="mt-4 pt-3 border-t border-terminal-border text-xs text-terminal-comment">
                <span className="mr-6">Duration: 2.16s</span>
                <span className="mr-6">LLM: 2</span>
                <span className="mr-6">Tools: 1</span>
                <span>Tokens: 2,050</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
