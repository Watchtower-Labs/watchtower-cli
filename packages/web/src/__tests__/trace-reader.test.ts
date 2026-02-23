import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Filename format: YYYY-MM-DD_runId.jsonl
// The id is the part after the first underscore.
const DATE_PREFIX = '2024-01-15'
const RUN_ID = 'abc123'
const FILENAME = `${DATE_PREFIX}_${RUN_ID}.jsonl`

const VALID_RUN_START = JSON.stringify({
  type: 'run.start',
  run_id: RUN_ID,
  timestamp: 1705315921.0,
  agent_name: 'test_agent',
})

const VALID_RUN_END = JSON.stringify({
  type: 'run.end',
  run_id: RUN_ID,
  timestamp: 1705315922.0,
  duration_ms: 1000,
})

let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `wt-web-${Date.now()}-${Math.floor(Math.random() * 1e9)}`)
  mkdirSync(testDir, { recursive: true })
  process.env['WATCHTOWER_TRACE_DIR'] = testDir
  vi.resetModules() // force re-import so env var is re-read by getTracesDir()
})

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true })
  delete process.env['WATCHTOWER_TRACE_DIR']
  vi.resetModules()
})

describe('listTraces', () => {
  it('returns empty array when directory is empty', async () => {
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces).toEqual([])
  })

  it('parses a valid JSONL trace file', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, VALID_RUN_END].join('\n')
    )
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces.length).toBeGreaterThanOrEqual(1)
    const trace = traces.find(t => t.id === RUN_ID)
    expect(trace).toBeDefined()
    expect(trace?.agent_name).toBe('test_agent')
  })

  it('populates date and filename fields correctly', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, VALID_RUN_END].join('\n')
    )
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    const trace = traces.find(t => t.id === RUN_ID)
    expect(trace).toBeDefined()
    expect(trace?.date).toBe(DATE_PREFIX)
    expect(trace?.filename).toBe(FILENAME)
  })

  it('does not throw on malformed JSONL lines', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, '{bad json}', VALID_RUN_END].join('\n')
    )
    const { listTraces } = await import('@/lib/trace-reader')
    expect(() => listTraces()).not.toThrow()
  })

  it('still parses trace when some lines are malformed', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, '{bad json}', VALID_RUN_END].join('\n')
    )
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    const trace = traces.find(t => t.id === RUN_ID)
    expect(trace).toBeDefined()
    expect(trace?.agent_name).toBe('test_agent')
  })

  it('returns empty array when directory does not exist', async () => {
    process.env['WATCHTOWER_TRACE_DIR'] = join(testDir, 'nonexistent')
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces).toEqual([])
  })

  it('ignores non-.jsonl files', async () => {
    writeFileSync(join(testDir, 'not-a-trace.txt'), 'some content')
    writeFileSync(join(testDir, 'README.md'), '# readme')
    const { listTraces } = await import('@/lib/trace-reader')
    const traces = listTraces()
    expect(traces).toEqual([])
  })
})

describe('readTrace', () => {
  it('returns null when trace file does not exist', async () => {
    const { readTrace } = await import('@/lib/trace-reader')
    const result = readTrace('nonexistent-id')
    expect(result).toBeNull()
  })

  it('returns full trace with events for a valid file', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, VALID_RUN_END].join('\n')
    )
    const { readTrace } = await import('@/lib/trace-reader')
    const trace = readTrace(RUN_ID)
    expect(trace).not.toBeNull()
    expect(trace?.id).toBe(RUN_ID)
    expect(trace?.agent_name).toBe('test_agent')
    expect(trace?.events).toBeDefined()
    expect(Array.isArray(trace?.events)).toBe(true)
    expect(trace?.events.length).toBeGreaterThanOrEqual(1)
  })

  it('includes summary in the returned trace', async () => {
    writeFileSync(
      join(testDir, FILENAME),
      [VALID_RUN_START, VALID_RUN_END].join('\n')
    )
    const { readTrace } = await import('@/lib/trace-reader')
    const trace = readTrace(RUN_ID)
    expect(trace?.summary).toBeDefined()
    expect(typeof trace?.summary.duration_ms).toBe('number')
    expect(typeof trace?.summary.llm_calls).toBe('number')
    expect(typeof trace?.summary.tool_calls).toBe('number')
  })
})
