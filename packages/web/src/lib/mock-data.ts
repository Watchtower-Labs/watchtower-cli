/**
 * Mock Trace Data for Watchtower
 *
 * Realistic mock traces matching the actual SDK output format.
 * Based on the trace file format: {date}_{run_id}.jsonl
 */

import { Trace, TraceEvent, TraceSummary } from './types'

// ===========================================
// HELPER FUNCTIONS
// ===========================================

function createEvent(
  type: TraceEvent['type'],
  run_id: string,
  timestamp: number,
  extra: Partial<TraceEvent> = {}
): TraceEvent {
  return {
    type,
    run_id,
    timestamp,
    ...extra,
  }
}

function generateEvents(run_id: string, startTime: number, agent_name: string, model: string = 'gemini-2.0-flash'): TraceEvent[] {
  const events: TraceEvent[] = []
  let t = startTime

  // run.start
  events.push(createEvent('run.start', run_id, t, { agent_name }))
  t += 12

  // llm.request
  events.push(createEvent('llm.request', run_id, t, { model }))
  t += 835

  // llm.response
  events.push(createEvent('llm.response', run_id, t, {
    duration_ms: 835,
    total_tokens: 1203,
    input_tokens: 523,
    output_tokens: 680,
  }))
  t += 3

  // tool.start
  events.push(createEvent('tool.start', run_id, t, {
    tool_name: 'search_web',
    tool_args: { query: 'latest AI developments' },
  }))
  t += 491

  // tool.end
  events.push(createEvent('tool.end', run_id, t, {
    tool_name: 'search_web',
    duration_ms: 491,
  }))
  t += 4

  // Another LLM call
  events.push(createEvent('llm.request', run_id, t, { model }))
  t += 756

  events.push(createEvent('llm.response', run_id, t, {
    duration_ms: 756,
    total_tokens: 892,
    input_tokens: 612,
    output_tokens: 280,
  }))
  t += 5

  // run.end
  events.push(createEvent('run.end', run_id, t, { duration_ms: t - startTime }))

  return events
}

function computeSummary(events: TraceEvent[]): TraceSummary {
  const llm_calls = events.filter(e => e.type === 'llm.response').length
  const tool_calls = events.filter(e => e.type === 'tool.end' || e.type === 'tool.error').length
  const total_tokens = events
    .filter(e => e.type === 'llm.response')
    .reduce((sum, e) => sum + (e.total_tokens || 0), 0)
  const errors = events.filter(e => e.type === 'tool.error').length
  const tools_used = Array.from(new Set(
    events
      .filter(e => e.tool_name)
      .map(e => e.tool_name!)
  ))
  const runEnd = events.find(e => e.type === 'run.end')
  const duration_ms = runEnd?.duration_ms || 0

  return { llm_calls, tool_calls, total_tokens, errors, duration_ms, tools_used }
}

// ===========================================
// MOCK TRACES
// ===========================================

const now = Date.now()

// Format date as YYYY-MM-DD
function formatDate(timestamp: number): string {
  const d = new Date(timestamp)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const mockTraces: Trace[] = [
  // Recent trace - just ran
  (() => {
    const id = 'abc123'
    const startTime = now - 180000 // 3 minutes ago
    const events = generateEvents(id, startTime, 'research_agent')
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'research_agent',
      app_name: 'my_app',
      startedAt: startTime,
      completedAt: startTime + 2106,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Another recent trace
  (() => {
    const id = 'def456'
    const startTime = now - 900000 // 15 minutes ago
    const events = generateEvents(id, startTime, 'code_writer', 'gemini-2.0-flash')
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'code_writer',
      app_name: 'watchtower',
      startedAt: startTime,
      completedAt: startTime + 4215,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Trace from an hour ago
  (() => {
    const id = 'ghi789'
    const startTime = now - 3600000 // 1 hour ago
    const events = [
      createEvent('run.start', 'ghi789', startTime, { agent_name: 'qa_agent' }),
      createEvent('llm.request', 'ghi789', startTime + 10, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'ghi789', startTime + 1245, { duration_ms: 1235, total_tokens: 2341, input_tokens: 1200, output_tokens: 1141 }),
      createEvent('tool.start', 'ghi789', startTime + 1250, { tool_name: 'run_tests', tool_args: { path: './tests' } }),
      createEvent('tool.end', 'ghi789', startTime + 8500, { tool_name: 'run_tests', duration_ms: 7250 }),
      createEvent('llm.request', 'ghi789', startTime + 8510, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'ghi789', startTime + 9200, { duration_ms: 690, total_tokens: 456, input_tokens: 200, output_tokens: 256 }),
      createEvent('run.end', 'ghi789', startTime + 9210, { duration_ms: 9210 }),
    ]
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'qa_agent',
      app_name: 'test_runner',
      startedAt: startTime,
      completedAt: startTime + 9210,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Trace with error
  (() => {
    const id = 'err001'
    const startTime = now - 7200000 // 2 hours ago
    const events = [
      createEvent('run.start', 'err001', startTime, { agent_name: 'deploy_agent' }),
      createEvent('llm.request', 'err001', startTime + 10, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'err001', startTime + 850, { duration_ms: 840, total_tokens: 1500, input_tokens: 800, output_tokens: 700 }),
      createEvent('tool.start', 'err001', startTime + 860, { tool_name: 'deploy', tool_args: { env: 'staging' } }),
      createEvent('tool.error', 'err001', startTime + 5860, { tool_name: 'deploy', duration_ms: 5000, error_message: 'Connection timeout: Unable to reach staging server' }),
      createEvent('run.end', 'err001', startTime + 5870, { duration_ms: 5870 }),
    ]
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'deploy_agent',
      app_name: 'deployer',
      startedAt: startTime,
      completedAt: startTime + 5870,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Yesterday's trace
  (() => {
    const id = 'xyz999'
    const startTime = now - 86400000 // 1 day ago
    const events = generateEvents(id, startTime, 'analysis_agent', 'gemini-1.5-pro')
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'analysis_agent',
      app_name: 'data_pipeline',
      startedAt: startTime,
      completedAt: startTime + 2106,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Multi-agent trace with transfer
  (() => {
    const id = 'multi01'
    const startTime = now - 1800000 // 30 minutes ago
    const events = [
      createEvent('run.start', 'multi01', startTime, { agent_name: 'orchestrator' }),
      createEvent('llm.request', 'multi01', startTime + 10, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'multi01', startTime + 600, { duration_ms: 590, total_tokens: 800, input_tokens: 400, output_tokens: 400 }),
      createEvent('agent.transfer', 'multi01', startTime + 610, { from_agent: 'orchestrator', to_agent: 'specialist' }),
      createEvent('llm.request', 'multi01', startTime + 620, { model: 'gemini-2.0-flash', agent_name: 'specialist' }),
      createEvent('llm.response', 'multi01', startTime + 1400, { duration_ms: 780, total_tokens: 1200, input_tokens: 600, output_tokens: 600 }),
      createEvent('tool.start', 'multi01', startTime + 1410, { tool_name: 'analyze_data', tool_args: { dataset: 'sales_q4' } }),
      createEvent('tool.end', 'multi01', startTime + 3410, { tool_name: 'analyze_data', duration_ms: 2000 }),
      createEvent('agent.transfer', 'multi01', startTime + 3420, { from_agent: 'specialist', to_agent: 'orchestrator' }),
      createEvent('llm.request', 'multi01', startTime + 3430, { model: 'gemini-2.0-flash', agent_name: 'orchestrator' }),
      createEvent('llm.response', 'multi01', startTime + 4000, { duration_ms: 570, total_tokens: 500, input_tokens: 300, output_tokens: 200 }),
      createEvent('run.end', 'multi01', startTime + 4010, { duration_ms: 4010 }),
    ]
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'orchestrator',
      app_name: 'multi_agent_system',
      startedAt: startTime,
      completedAt: startTime + 4010,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Long running trace with state changes
  (() => {
    const id = 'state01'
    const startTime = now - 5400000 // 1.5 hours ago
    const events = [
      createEvent('run.start', 'state01', startTime, { agent_name: 'workflow_agent' }),
      createEvent('state.change', 'state01', startTime + 5, { state_delta: { status: 'initialized' } }),
      createEvent('llm.request', 'state01', startTime + 10, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'state01', startTime + 900, { duration_ms: 890, total_tokens: 1800, input_tokens: 900, output_tokens: 900 }),
      createEvent('state.change', 'state01', startTime + 910, { state_delta: { step: 1, processed: 0 } }),
      createEvent('tool.start', 'state01', startTime + 920, { tool_name: 'process_batch', tool_args: { batch_size: 100 } }),
      createEvent('tool.end', 'state01', startTime + 5920, { tool_name: 'process_batch', duration_ms: 5000 }),
      createEvent('state.change', 'state01', startTime + 5930, { state_delta: { step: 2, processed: 100 } }),
      createEvent('llm.request', 'state01', startTime + 5940, { model: 'gemini-2.0-flash' }),
      createEvent('llm.response', 'state01', startTime + 6500, { duration_ms: 560, total_tokens: 600, input_tokens: 400, output_tokens: 200 }),
      createEvent('state.change', 'state01', startTime + 6510, { state_delta: { status: 'completed' } }),
      createEvent('run.end', 'state01', startTime + 6520, { duration_ms: 6520 }),
    ]
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'workflow_agent',
      app_name: 'batch_processor',
      startedAt: startTime,
      completedAt: startTime + 6520,
      events,
      summary: computeSummary(events),
    }
  })(),

  // Trace from 2 days ago
  (() => {
    const id = 'old001'
    const startTime = now - 172800000 // 2 days ago
    const events = generateEvents(id, startTime, 'maintenance_agent')
    return {
      id,
      filename: `${formatDate(startTime)}_${id}.jsonl`,
      date: formatDate(startTime),
      agent_name: 'maintenance_agent',
      app_name: 'system_tools',
      startedAt: startTime,
      completedAt: startTime + 2106,
      events,
      summary: computeSummary(events),
    }
  })(),
]

// ===========================================
// HELPER GETTERS
// ===========================================

export function getTraceById(id: string): Trace | undefined {
  return mockTraces.find(trace => trace.id === id)
}

export function getTracesByAgent(agent_name: string): Trace[] {
  return mockTraces.filter(trace => trace.agent_name === agent_name)
}

export function getTracesByDate(date: string): Trace[] {
  return mockTraces.filter(trace => trace.date === date)
}

export function getRecentTraces(limit: number = 10): Trace[] {
  return [...mockTraces]
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, limit)
}

// Get unique agent names from traces
export function getAgentNames(): string[] {
  return Array.from(new Set(mockTraces.map(t => t.agent_name)))
}
