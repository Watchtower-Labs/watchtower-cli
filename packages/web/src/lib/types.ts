/**
 * Watchtower Types
 *
 * Types for trace viewing and observability.
 * Based on the actual trace file format from the SDK.
 */

// ===========================================
// TRACE EVENT TYPES (from SDK)
// ===========================================

export type EventType =
  | 'run.start'
  | 'run.end'
  | 'llm.request'
  | 'llm.response'
  | 'tool.start'
  | 'tool.end'
  | 'tool.error'
  | 'state.change'
  | 'agent.transfer'

export interface TraceEvent {
  type: EventType
  run_id: string
  timestamp: number
  agent_name?: string
  model?: string
  duration_ms?: number
  total_tokens?: number
  input_tokens?: number
  output_tokens?: number
  tool_name?: string
  tool_args?: Record<string, unknown>
  error_message?: string
  state_delta?: Record<string, unknown>
  from_agent?: string
  to_agent?: string
}

// ===========================================
// TRACE SUMMARY
// ===========================================

export interface TraceSummary {
  duration_ms: number
  llm_calls: number
  tool_calls: number
  total_tokens: number
  errors: number
  tools_used: string[]
}

// ===========================================
// TRACE (replaces Run)
// ===========================================

export interface Trace {
  id: string
  filename: string
  date: string
  agent_name: string
  app_name?: string
  startedAt: number
  completedAt?: number
  events: TraceEvent[]
  summary: TraceSummary
}

// ===========================================
// UI STATE
// ===========================================

export type ViewMode = 'overview' | 'timeline'

export interface FilterState {
  search?: string
  agent?: string
  dateRange?: { from: number; to: number }
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`

  return new Date(timestamp).toLocaleDateString()
}

export function formatTimestamp(timestamp: number, format: 'relative' | 'absolute' = 'relative'): string {
  if (format === 'relative') {
    return formatRelativeTime(timestamp)
  }
  return new Date(timestamp).toLocaleString()
}

export function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`
  }
  return tokens.toLocaleString()
}

export function getEventIcon(type: EventType): string {
  switch (type) {
    case 'run.start': return '▶'
    case 'run.end': return '■'
    case 'llm.request': return '→'
    case 'llm.response': return '←'
    case 'tool.start': return '⚙'
    case 'tool.end': return '✓'
    case 'tool.error': return '✗'
    case 'state.change': return '◇'
    case 'agent.transfer': return '⇄'
    default: return '•'
  }
}

export function getEventLabel(type: EventType): string {
  switch (type) {
    case 'run.start': return 'Run Started'
    case 'run.end': return 'Run Completed'
    case 'llm.request': return 'LLM Request'
    case 'llm.response': return 'LLM Response'
    case 'tool.start': return 'Tool Started'
    case 'tool.end': return 'Tool Completed'
    case 'tool.error': return 'Tool Error'
    case 'state.change': return 'State Change'
    case 'agent.transfer': return 'Agent Transfer'
    default: return type
  }
}
