/**
 * Core TypeScript interfaces for Watchtower CLI
 */

// Event types emitted by the Python SDK
export type EventType =
	| 'run.start'
	| 'run.end'
	| 'llm.request'
	| 'llm.response'
	| 'tool.start'
	| 'tool.end'
	| 'tool.error'
	| 'state.change'
	| 'agent.transfer';

// Base trace event structure (from JSONL files)
export interface TraceEvent {
	type: EventType;
	run_id: string;
	timestamp: number;
	schema_version?: string; // Optional for backwards compat with older traces
	// Event-specific fields
	[key: string]: unknown;
}

// Run lifecycle events
export interface RunStartEvent extends TraceEvent {
	type: 'run.start';
	invocation_id: string;
	agent_name: string;
}

export interface RunEndEvent extends TraceEvent {
	type: 'run.end';
	duration_ms: number;
	summary: RunSummaryData;
}

// LLM events
export interface LLMRequestEvent extends TraceEvent {
	type: 'llm.request';
	request_id: string;
	model: string;
	message_count: number;
	tools_available: string[];
}

export interface LLMResponseEvent extends TraceEvent {
	type: 'llm.response';
	request_id: string;
	duration_ms: number;
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
	has_tool_calls: boolean;
	finish_reason: string;
}

// Tool events
export interface ToolStartEvent extends TraceEvent {
	type: 'tool.start';
	tool_call_id: string;
	tool_name: string;
	tool_args: Record<string, unknown>;
	agent_name: string;
}

export interface ToolEndEvent extends TraceEvent {
	type: 'tool.end';
	tool_call_id: string;
	tool_name: string;
	duration_ms: number;
	response_preview: string;
	success: boolean;
}

export interface ToolErrorEvent extends TraceEvent {
	type: 'tool.error';
	tool_call_id: string;
	tool_name: string;
	error_type: string;
	error_message: string;
}

// State and transfer events
export interface StateChangeEvent extends TraceEvent {
	type: 'state.change';
	author: string;
	state_delta: Record<string, unknown>;
}

export interface AgentTransferEvent extends TraceEvent {
	type: 'agent.transfer';
	from_agent: string;
	to_agent: string;
	reason: string;
}

// Summary data embedded in run.end events
export interface RunSummaryData {
	llm_calls: number;
	tool_calls: number;
	total_tokens: number;
	errors: number;
	tools_used?: string[];
}

// Aggregated trace summary (computed by CLI)
export interface TraceSummary {
	runId: string;
	agentName: string;
	startTime: number;
	endTime: number;
	duration: number;
	llmCalls: number;
	toolCalls: number;
	totalTokens: number;
	errors: number;
	toolsUsed: string[];
}

// Process lifecycle status
export type ProcessStatus = 'starting' | 'running' | 'stopped' | 'error';

// Real-time statistics during live tailing
export interface LiveStats {
	startTime: number;
	duration: number;
	llmCalls: number;
	toolCalls: number;
	tokens: number;
	errors: number;
	processedEvents: number;
	throttledEvents: number;
	isThrottling: boolean;
	lastThrottleWaitMs: number;
}

// Trace file metadata for list command
export interface TraceFileInfo {
	path: string;
	runId: string;
	date: string;
	size: number;
	modifiedAt: Date;
	eventCount?: number;
}

// JSON-RPC 2.0 notification (live stream format)
export interface JsonRpcNotification {
	jsonrpc: '2.0';
	method: string;
	params: TraceEvent;
}

// Keyboard handler types
export interface KeyboardHandlers {
	onUp?: () => void;
	onDown?: () => void;
	onEnter?: () => void;
	onEscape?: () => void;
	onBack?: () => void;
	onQuit?: () => void;
	onPause?: () => void;
	onPageUp?: () => void;
	onPageDown?: () => void;
	onHome?: () => void;
	onEnd?: () => void;
	onCustom?: (key: string) => void;
}

// Key binding configuration
export interface KeyBindings {
	quit: string[];
	up: string[];
	down: string[];
	enter: string[];
	escape: string[];
	pageUp: string[];
	pageDown: string[];
	home: string[];
	end: string[];
	bookmark: string[];
	help: string[];
	search: string[];
	export: string[];
}

// Default key bindings
export const defaultKeyBindings: KeyBindings = {
	quit: ['q'],
	up: ['k', 'up'],
	down: ['j', 'down'],
	enter: ['return'],
	escape: ['escape'],
	pageUp: ['pageup'],
	pageDown: ['pagedown'],
	home: ['home'],
	end: ['end'],
	bookmark: ['*'],
	help: ['?'],
	search: ['/'],
	export: ['e'],
};

// CLI configuration
export interface CliConfig {
	theme: 'dark' | 'light' | 'minimal';
	maxEvents: number;
	timestampFormat: 'relative' | 'absolute' | 'unix';
	defaultPython: string;
	liveMaxEventsPerSecond: number;
	liveBurstSize: number;
	showPageSize: number;
	liveMaxBuffer: number;
	keybindings?: Partial<KeyBindings>;
}

// Default configuration
export const defaultConfig: CliConfig = {
	theme: 'dark',
	maxEvents: 1000,
	timestampFormat: 'relative',
	defaultPython: 'python3',
	liveMaxEventsPerSecond: 120,
	liveBurstSize: 30,
	showPageSize: 200,
	liveMaxBuffer: 500,
};

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED TRACE ANALYSIS TYPES
// ═══════════════════════════════════════════════════════════════════════════

// Agent information extracted from trace
export interface AgentInfo {
	name: string;
	eventCount: number;
	toolCalls: number;
	llmCalls: number;
	tokens: number;
	isActive: boolean;
	firstEventIndex: number;
	lastEventIndex: number;
}

// Model information extracted from trace
export interface ModelInfo {
	name: string;
	requestCount: number;
	totalTokens: number;
	inputTokens: number;
	outputTokens: number;
	avgLatencyMs: number;
}

// Tool information extracted from trace
export interface ToolInfo {
	name: string;
	callCount: number;
	successCount: number;
	errorCount: number;
	avgDurationMs: number;
	totalDurationMs: number;
}

// Event grouped by agent for timeline display
export interface AgentEventGroup {
	agentName: string;
	events: TraceEvent[];
	startIndex: number;
	endIndex: number;
}

// Enhanced trace analysis with agents, models, tools
export interface TraceAnalysis {
	summary: TraceSummary;
	agents: AgentInfo[];
	models: ModelInfo[];
	tools: ToolInfo[];
	eventGroups: AgentEventGroup[];
	activeAgentName: string;
	hasMultipleAgents: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// STREAMING PARSER TYPES
// ═══════════════════════════════════════════════════════════════════════════

// Streaming parser options
export interface StreamingParserOptions {
	/**
	 * Maximum number of events to buffer in memory
	 * @default 100
	 */
	bufferSize?: number;

	/**
	 * Maximum events per page for pagination
	 * @default 100
	 */
	pageSize?: number;

	/**
	 * Callback for progress updates
	 */
	onProgress?: (progress: {current: number; total: number}) => void;

	/**
	 * Enable backpressure handling
	 * @default true
	 */
	backpressureEnabled?: boolean;
}

// Paged events result
export interface PagedEvents {
	/**
	 * Events for the current page
	 */
	events: TraceEvent[];

	/**
	 * Current page number (0-indexed)
	 */
	page: number;

	/**
	 * Total number of pages
	 */
	totalPages: number;

	/**
	 * Total number of events in file
	 */
	totalEvents: number;

	/**
	 * Whether there's a next page
	 */
	hasNext: boolean;

	/**
	 * Whether there's a previous page
	 */
	hasPrevious: boolean;

	/**
	 * Summary of all events (available after full parse)
	 */
	summary: TraceSummary;
}

// ═══════════════════════════════════════════════════════════════════════════
// RATE LIMITER TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface RateLimiterOptions {
	/**
	 * Maximum events per second to process
	 * @default 100
	 */
	maxEventsPerSecond?: number;

	/**
	 * Buffer size for burst tolerance
	 * @default 10
	 */
	burstSize?: number;

	/**
	 * Callback when throttling state changes
	 */
	onThrottlingChange?: (isThrottling: boolean) => void;
}

export interface RateLimiterResult {
	/**
	 * Whether event should be processed immediately
	 */
	shouldProcess: boolean;

	/**
	 * Whether event is being throttled
	 */
	isThrottled: boolean;

	/**
	 * Estimated wait time in milliseconds before next event can be processed
	 */
	waitTime: number;
}

// ═════════════════════════════════════════════════════════════════════════
// FRAMEWORK TYPES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Supported AI agent frameworks
 */
export type AgentFramework =
	| 'google_adk'
	| 'anthropic'
	| 'openai'
	| 'langchain'
	| 'autogen'
	| 'unknown';

/**
 * Framework-specific configuration
 */
export interface FrameworkConfig {
	/**
	 * The framework being used
	 */
	framework: AgentFramework;

	/**
	 * Framework-specific settings
	 */
	settings: Record<string, unknown>;
}
