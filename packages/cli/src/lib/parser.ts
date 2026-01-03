/**
 * NDJSON and JSON-RPC parsing utilities
 */

import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type {
	TraceEvent,
	TraceSummary,
	JsonRpcNotification,
	EventType,
} from './types.js';

// Valid event types for validation
const validEventTypes = new Set<string>([
	'run.start',
	'run.end',
	'llm.request',
	'llm.response',
	'tool.start',
	'tool.end',
	'tool.error',
	'state.change',
	'agent.transfer',
]);

// Parse a single JSONL line into a TraceEvent
export function parseLine(line: string): TraceEvent | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) {
		return null;
	}

	try {
		const parsed = JSON.parse(trimmed) as Record<string, unknown>;

		// Validate required fields
		if (
			typeof parsed['type'] !== 'string' ||
			typeof parsed['run_id'] !== 'string' ||
			typeof parsed['timestamp'] !== 'number'
		) {
			return null;
		}

		// Validate event type
		if (!validEventTypes.has(parsed['type'])) {
			return null;
		}

		return parsed as TraceEvent;
	} catch {
		return null;
	}
}

// Parse a JSON-RPC 2.0 notification (live stream format)
export function parseJsonRpc(line: string): TraceEvent | null {
	const trimmed = line.trim();
	if (!trimmed) {
		return null;
	}

	try {
		const parsed = JSON.parse(trimmed) as Record<string, unknown>;

		// Validate JSON-RPC structure
		if (parsed['jsonrpc'] !== '2.0' || !parsed['params']) {
			return null;
		}

		const notification = parsed as unknown as JsonRpcNotification;
		return notification.params;
	} catch {
		return null;
	}
}

// Stream parse an entire trace file
export async function parseTraceFile(filePath: string): Promise<{
	events: TraceEvent[];
	summary: TraceSummary;
	errors: number;
}> {
	const events: TraceEvent[] = [];
	let parseErrors = 0;

	const fileStream = fs.createReadStream(filePath);
	const rl = readline.createInterface({
		input: fileStream,
		crlfDelay: Infinity,
	});

	for await (const line of rl) {
		const event = parseLine(line);
		if (event) {
			events.push(event);
		} else if (line.trim()) {
			parseErrors++;
		}
	}

	const summary = aggregateSummary(events);

	return {
		events,
		summary,
		errors: parseErrors,
	};
}

// Aggregate events into a summary
export function aggregateSummary(events: TraceEvent[]): TraceSummary {
	let runId = '';
	let agentName = '';
	let startTime = 0;
	let endTime = 0;
	let llmCalls = 0;
	let toolCalls = 0;
	let totalTokens = 0;
	let errors = 0;
	const toolsUsed = new Set<string>();

	for (const event of events) {
		if (!runId && event.run_id) {
			runId = event.run_id;
		}

		switch (event.type) {
			case 'run.start': {
				startTime = event.timestamp;
				agentName = (event as {agent_name?: string}).agent_name ?? '';
				break;
			}

			case 'run.end': {
				endTime = event.timestamp;
				break;
			}

			case 'llm.response': {
				llmCalls++;
				const tokens = (event as {total_tokens?: number}).total_tokens ?? 0;
				totalTokens += tokens;
				break;
			}

			case 'tool.start': {
				toolCalls++;
				const toolName = (event as {tool_name?: string}).tool_name;
				if (toolName) {
					toolsUsed.add(toolName);
				}

				break;
			}

			case 'tool.error': {
				errors++;
				break;
			}
		}
	}

	// Calculate duration
	const duration = endTime > startTime ? (endTime - startTime) * 1000 : 0;

	return {
		runId,
		agentName,
		startTime,
		endTime,
		duration,
		llmCalls,
		toolCalls,
		totalTokens,
		errors,
		toolsUsed: [...toolsUsed],
	};
}

// Create an empty summary
export function emptySummary(): TraceSummary {
	return {
		runId: '',
		agentName: '',
		startTime: 0,
		endTime: 0,
		duration: 0,
		llmCalls: 0,
		toolCalls: 0,
		totalTokens: 0,
		errors: 0,
		toolsUsed: [],
	};
}

// Extract detail string from an event for display
export function getEventDetail(event: TraceEvent): string {
	switch (event.type) {
		case 'run.start': {
			const e = event as {agent_name?: string};
			return e.agent_name ?? '';
		}

		case 'run.end': {
			const e = event as {duration_ms?: number};
			return e.duration_ms ? `${(e.duration_ms / 1000).toFixed(2)}s` : '';
		}

		case 'llm.request': {
			const e = event as {model?: string; message_count?: number};
			return e.model ?? '';
		}

		case 'llm.response': {
			const e = event as {total_tokens?: number; duration_ms?: number};
			const parts: string[] = [];
			if (e.total_tokens) {
				parts.push(`${e.total_tokens.toLocaleString()} tokens`);
			}

			if (e.duration_ms) {
				parts.push(`${Math.round(e.duration_ms)}ms`);
			}

			return parts.join('  ');
		}

		case 'tool.start': {
			const e = event as {tool_name?: string};
			return e.tool_name ?? '';
		}

		case 'tool.end': {
			const e = event as {tool_name?: string; duration_ms?: number};
			const parts: string[] = [];
			if (e.tool_name) {
				parts.push(e.tool_name);
			}

			if (e.duration_ms) {
				parts.push(`${Math.round(e.duration_ms)}ms`);
			}

			return parts.join('  ');
		}

		case 'tool.error': {
			const e = event as {tool_name?: string; error_type?: string};
			return e.error_type ? `${e.tool_name}: ${e.error_type}` : e.tool_name ?? '';
		}

		case 'state.change': {
			const e = event as {author?: string};
			return e.author ?? '';
		}

		case 'agent.transfer': {
			const e = event as {from_agent?: string; to_agent?: string};
			return e.from_agent && e.to_agent
				? `${e.from_agent} → ${e.to_agent}`
				: '';
		}

		default: {
			return '';
		}
	}
}

// Check if an event type is an error
export function isErrorEvent(type: EventType): boolean {
	return type === 'tool.error';
}
