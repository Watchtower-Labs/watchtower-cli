/**
 * NDJSON and JSON-RPC parsing utilities
 */

import * as fs from 'node:fs';
import * as readline from 'node:readline';
import type {TraceEvent, TraceSummary, EventType} from './types.js';

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

// Validate that an object has valid TraceEvent fields
function isValidTraceEvent(obj: unknown): obj is TraceEvent {
	if (typeof obj !== 'object' || obj === null) {
		return false;
	}

	const record = obj as Record<string, unknown>;

	// Validate required fields
	if (typeof record['type'] !== 'string') {
		return false;
	}

	if (typeof record['run_id'] !== 'string') {
		return false;
	}

	// Timestamp can be number or parseable string
	const timestamp = record['timestamp'];
	if (typeof timestamp === 'number') {
		// Valid number timestamp
	} else if (typeof timestamp === 'string') {
		const parsed = Number(timestamp);
		if (isNaN(parsed)) {
			return false;
		}
	} else {
		return false;
	}

	// Validate event type
	if (!validEventTypes.has(record['type'])) {
		return false;
	}

	return true;
}

// Parse a single JSONL line into a TraceEvent
export function parseLine(line: string): TraceEvent | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) {
		return null;
	}

	try {
		const parsed = JSON.parse(trimmed) as unknown;

		if (!isValidTraceEvent(parsed)) {
			return null;
		}

		return parsed;
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

		const params = parsed['params'];

		// Validate that params contains a valid TraceEvent
		if (!isValidTraceEvent(params)) {
			return null;
		}

		return params;
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
			return e.error_type
				? `${e.tool_name}: ${e.error_type}`
				: e.tool_name ?? '';
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

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED TRACE ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════

import type {
	AgentInfo,
	ModelInfo,
	ToolInfo,
	AgentEventGroup,
	TraceAnalysis,
} from './types.js';

// Extract the agent name from an event
export function getEventAgentName(event: TraceEvent): string {
	// Check various fields that might contain agent name
	const e = event as Record<string, unknown>;
	return (
		(e['agent_name'] as string) ??
		(e['author'] as string) ??
		(e['from_agent'] as string) ??
		''
	);
}

// Analyze trace to extract agents, models, tools information
export function analyzeTrace(events: TraceEvent[]): TraceAnalysis {
	const summary = aggregateSummary(events);

	// Track agents
	const agentMap = new Map<
		string,
		{
			eventCount: number;
			toolCalls: number;
			llmCalls: number;
			tokens: number;
			firstEventIndex: number;
			lastEventIndex: number;
		}
	>();

	// Track models
	const modelMap = new Map<
		string,
		{
			requestCount: number;
			totalTokens: number;
			inputTokens: number;
			outputTokens: number;
			totalLatencyMs: number;
		}
	>();

	// Track tools
	const toolMap = new Map<
		string,
		{
			callCount: number;
			successCount: number;
			errorCount: number;
			totalDurationMs: number;
		}
	>();

	// Track current agent for each event
	let currentAgentName = '';
	let activeAgentName = '';

	// Track pending LLM request to match with response
	let pendingModelName = '';

	// Process events
	for (let i = 0; i < events.length; i++) {
		const event = events[i]!;

		// Update current agent based on event
		if (event.type === 'run.start') {
			const e = event as {agent_name?: string};
			currentAgentName = e.agent_name ?? 'unknown';
			activeAgentName = currentAgentName;
		} else if (event.type === 'agent.transfer') {
			const e = event as {to_agent?: string};
			currentAgentName = e.to_agent ?? currentAgentName;
			activeAgentName = currentAgentName;
		}

		// Get agent name for this event
		const agentName = getEventAgentName(event) || currentAgentName || 'unknown';

		// Update agent stats
		if (!agentMap.has(agentName)) {
			agentMap.set(agentName, {
				eventCount: 0,
				toolCalls: 0,
				llmCalls: 0,
				tokens: 0,
				firstEventIndex: i,
				lastEventIndex: i,
			});
		}

		const agentStats = agentMap.get(agentName)!;
		agentStats.eventCount++;
		agentStats.lastEventIndex = i;

		// Process event-specific data
		switch (event.type) {
			case 'llm.request': {
				const e = event as {model?: string};
				const modelName = e.model ?? 'unknown';

				// Track pending model for matching with response
				pendingModelName = modelName;

				if (!modelMap.has(modelName)) {
					modelMap.set(modelName, {
						requestCount: 0,
						totalTokens: 0,
						inputTokens: 0,
						outputTokens: 0,
						totalLatencyMs: 0,
					});
				}

				modelMap.get(modelName)!.requestCount++;
				break;
			}

			case 'llm.response': {
				agentStats.llmCalls++;
				const e = event as {
					total_tokens?: number;
					input_tokens?: number;
					output_tokens?: number;
					duration_ms?: number;
					model?: string;
				};
				agentStats.tokens += e.total_tokens ?? 0;

				// Match with the pending model or use response model if available
				const responseModelName = e.model ?? pendingModelName ?? 'unknown';
				const modelStats = modelMap.get(responseModelName);

				if (modelStats) {
					modelStats.totalTokens += e.total_tokens ?? 0;
					modelStats.inputTokens += e.input_tokens ?? 0;
					modelStats.outputTokens += e.output_tokens ?? 0;
					modelStats.totalLatencyMs += e.duration_ms ?? 0;
				}

				break;
			}

			case 'tool.start': {
				agentStats.toolCalls++;
				const e = event as {tool_name?: string};
				const toolName = e.tool_name ?? 'unknown';
				if (!toolMap.has(toolName)) {
					toolMap.set(toolName, {
						callCount: 0,
						successCount: 0,
						errorCount: 0,
						totalDurationMs: 0,
					});
				}

				toolMap.get(toolName)!.callCount++;
				break;
			}

			case 'tool.end': {
				const e = event as {
					tool_name?: string;
					duration_ms?: number;
					success?: boolean;
				};
				const toolName = e.tool_name ?? 'unknown';
				const toolStats = toolMap.get(toolName);
				if (toolStats) {
					if (e.success !== false) {
						toolStats.successCount++;
					}

					toolStats.totalDurationMs += e.duration_ms ?? 0;
				}

				break;
			}

			case 'tool.error': {
				const e = event as {tool_name?: string};
				const toolName = e.tool_name ?? 'unknown';
				const toolStats = toolMap.get(toolName);
				if (toolStats) {
					toolStats.errorCount++;
				}

				break;
			}
		}
	}

	// Convert maps to arrays
	const agents: AgentInfo[] = [...agentMap.entries()].map(([name, stats]) => ({
		name,
		eventCount: stats.eventCount,
		toolCalls: stats.toolCalls,
		llmCalls: stats.llmCalls,
		tokens: stats.tokens,
		isActive: name === activeAgentName,
		firstEventIndex: stats.firstEventIndex,
		lastEventIndex: stats.lastEventIndex,
	}));

	const models: ModelInfo[] = [...modelMap.entries()].map(([name, stats]) => ({
		name,
		requestCount: stats.requestCount,
		totalTokens: stats.totalTokens,
		inputTokens: stats.inputTokens,
		outputTokens: stats.outputTokens,
		avgLatencyMs:
			stats.requestCount > 0 ? stats.totalLatencyMs / stats.requestCount : 0,
	}));

	const tools: ToolInfo[] = [...toolMap.entries()].map(([name, stats]) => ({
		name,
		callCount: stats.callCount,
		successCount: stats.successCount,
		errorCount: stats.errorCount,
		avgDurationMs:
			stats.callCount > 0 ? stats.totalDurationMs / stats.callCount : 0,
		totalDurationMs: stats.totalDurationMs,
	}));

	// Group events by agent
	const eventGroups = groupEventsByAgent(events, agents);

	return {
		summary,
		agents,
		models,
		tools,
		eventGroups,
		activeAgentName,
		hasMultipleAgents: agents.length > 1,
	};
}

// Group events into agent sections for timeline display
function groupEventsByAgent(
	events: TraceEvent[],
	agents: AgentInfo[],
): AgentEventGroup[] {
	if (agents.length <= 1) {
		// Single agent - return all events as one group
		const agentName = agents[0]?.name ?? 'unknown';
		return [
			{
				agentName,
				events,
				startIndex: 0,
				endIndex: events.length - 1,
			},
		];
	}

	// Multi-agent - group by agent.transfer events
	const groups: AgentEventGroup[] = [];
	let currentGroup: TraceEvent[] = [];
	let currentAgentName = agents[0]?.name ?? 'unknown';
	let groupStartIndex = 0;

	for (let i = 0; i < events.length; i++) {
		const event = events[i]!;

		if (event.type === 'run.start') {
			const e = event as {agent_name?: string};
			currentAgentName = e.agent_name ?? 'unknown';
		}

		if (event.type === 'agent.transfer') {
			// Save current group
			if (currentGroup.length > 0) {
				groups.push({
					agentName: currentAgentName,
					events: currentGroup,
					startIndex: groupStartIndex,
					endIndex: i - 1,
				});
			}

			// Add transfer event as its own "group" for special rendering
			groups.push({
				agentName: '__transfer__',
				events: [event],
				startIndex: i,
				endIndex: i,
			});

			// Start new group
			const e = event as {to_agent?: string};
			currentAgentName = e.to_agent ?? 'unknown';
			currentGroup = [];
			groupStartIndex = i + 1;
		} else {
			currentGroup.push(event);
		}
	}

	// Add final group
	if (currentGroup.length > 0) {
		groups.push({
			agentName: currentAgentName,
			events: currentGroup,
			startIndex: groupStartIndex,
			endIndex: events.length - 1,
		});
	}

	return groups;
}
