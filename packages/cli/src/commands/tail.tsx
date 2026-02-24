/**
 * Tail command - Run a script and stream events live
 *
 * Design: Enhanced live streaming view with agent tracking
 */

import React, {useState, useCallback, useRef, useReducer} from 'react';
import {Box, Text, Static} from 'ink';
import {Header} from '../components/Header.js';
import {Summary} from '../components/Summary.js';
import {EventLine} from '../components/EventLine.js';
import {StatusBar} from '../components/StatusBar.js';
import {Spinner} from '../components/Spinner.js';
import {AgentPanel} from '../components/AgentPanel.js';
import {InfoPanel} from '../components/InfoPanel.js';
import {ErrorDisplay} from '../components/ErrorDisplay.js';
import {useProcessStream} from '../hooks/useProcessStream.js';
import {useKeyboard} from '../hooks/useKeyboard.js';
import {useTerminalSize} from '../hooks/useTerminalSize.js';
import type {TraceEvent, AgentInfo, ModelInfo, ToolInfo} from '../lib/types.js';
import {colors} from '../lib/theme.js';
import {getConfig} from '../lib/config.js';

// Default max events buffer — overridden by config.maxEvents
const DEFAULT_MAX_EVENTS_BUFFER = 500;

// ── Live state reducer ────────────────────────────────────────────────────────

type LiveState = {
	completedEvents: TraceEvent[];
	currentEvent: TraceEvent | null;
	baseTimestamp: number;
	agents: AgentInfo[];
	models: ModelInfo[];
	tools: ToolInfo[];
	currentAgentName: string;
};

type LiveAction = {
	type: 'ADD_EVENT';
	event: TraceEvent;
	maxBuffer: number;
	agentUpdates?: AgentInfo[];
	modelUpdates?: ModelInfo[];
	toolUpdates?: ToolInfo[];
	newCurrentAgentName?: string;
};

const initialLiveState: LiveState = {
	completedEvents: [],
	currentEvent: null,
	baseTimestamp: 0,
	agents: [],
	models: [],
	tools: [],
	currentAgentName: '',
};

function liveReducer(state: LiveState, action: LiveAction): LiveState {
	const {event, maxBuffer} = action;

	// Move previous current event into completed buffer (single allocation)
	let completed = state.currentEvent
		? [...state.completedEvents, state.currentEvent]
		: state.completedEvents;

	if (completed.length > maxBuffer) {
		completed = completed.slice(-maxBuffer);
	}

	return {
		completedEvents: completed,
		currentEvent: event,
		baseTimestamp: state.baseTimestamp === 0 ? event.timestamp : state.baseTimestamp,
		agents: action.agentUpdates ?? state.agents,
		models: action.modelUpdates ?? state.models,
		tools: action.toolUpdates ?? state.tools,
		currentAgentName: action.newCurrentAgentName ?? state.currentAgentName,
	};
}

export interface TailCommandProps {
	script: string[];
	maxEventsPerSecond?: number;
	burstSize?: number;
}

export function TailCommand({
	script,
	maxEventsPerSecond,
	burstSize,
}: TailCommandProps): React.ReactElement {
	const config = getConfig();
	const MAX_EVENTS_BUFFER = config.liveMaxBuffer ?? DEFAULT_MAX_EVENTS_BUFFER;
	const [paused, setPaused] = useState(false);
	const [liveState, dispatch] = useReducer(liveReducer, initialLiveState);
	const {completedEvents, currentEvent, baseTimestamp, agents, models, tools, currentAgentName} = liveState;

	const terminalSize = useTerminalSize();
	const separatorWidth = Math.max(40, terminalSize.columns - 6);

	// Refs for stale-closure-free access inside useCallback
	const completedEventsRef = useRef<TraceEvent[]>([]);
	const currentEventRef = useRef<TraceEvent | null>(null);

	// Track agents, models, tools in real-time via mutable maps (no render on mutation)
	const agentMapRef = useRef<Map<string, AgentInfo>>(new Map());
	const modelMapRef = useRef<Map<string, ModelInfo>>(new Map());
	const toolMapRef = useRef<Map<string, ToolInfo>>(new Map());
	const pendingModelRef = useRef<string>(''); // Track which model is awaiting response
	const currentAgentNameRef = useRef<string>(''); // Ref copy avoids stale closure in handleEvent

	// Handle incoming events — single dispatch per event batches all state updates
	const handleEvent = useCallback(
		(event: TraceEvent) => {
			if (paused) return;

			let agentUpdates: AgentInfo[] | undefined;
			let modelUpdates: ModelInfo[] | undefined;
			let toolUpdates: ToolInfo[] | undefined;
			let newCurrentAgentName: string | undefined;

			// ── Agent tracking ─────────────────────────────────────────────────
			if (event.type === 'run.start') {
				const agentName = (event as Record<string, unknown>)['agent_name'];
				const name = typeof agentName === 'string' ? agentName : 'unknown';
				newCurrentAgentName = name;
				currentAgentNameRef.current = name;

				if (!agentMapRef.current.has(name)) {
					agentMapRef.current.set(name, {
						name,
						eventCount: 0,
						toolCalls: 0,
						llmCalls: 0,
						tokens: 0,
						isActive: true,
						firstEventIndex: completedEventsRef.current.length,
						lastEventIndex: completedEventsRef.current.length,
					});
				}
				for (const [n, a] of agentMapRef.current.entries()) {
					agentMapRef.current.set(n, {...a, isActive: n === name});
				}
				agentUpdates = [...agentMapRef.current.values()];
			} else if (event.type === 'agent.transfer') {
				const toAgentRaw = (event as Record<string, unknown>)['to_agent'];
				const toAgent = typeof toAgentRaw === 'string' ? toAgentRaw : 'unknown';
				newCurrentAgentName = toAgent;
				currentAgentNameRef.current = toAgent;

				if (!agentMapRef.current.has(toAgent)) {
					agentMapRef.current.set(toAgent, {
						name: toAgent,
						eventCount: 0,
						toolCalls: 0,
						llmCalls: 0,
						tokens: 0,
						isActive: true,
						firstEventIndex: completedEventsRef.current.length,
						lastEventIndex: completedEventsRef.current.length,
					});
				}
				for (const [n, a] of agentMapRef.current.entries()) {
					agentMapRef.current.set(n, {...a, isActive: n === toAgent});
				}
				agentUpdates = [...agentMapRef.current.values()];
			}

			// ── Model tracking ─────────────────────────────────────────────────
			if (event.type === 'llm.request') {
				const raw = event as Record<string, unknown>;
				const modelName = typeof raw['model'] === 'string' ? raw['model'] : 'unknown';
				pendingModelRef.current = modelName;

				if (!modelMapRef.current.has(modelName)) {
					modelMapRef.current.set(modelName, {
						name: modelName,
						requestCount: 0,
						totalTokens: 0,
						inputTokens: 0,
						outputTokens: 0,
						avgLatencyMs: 0,
					});
				}
				const m = modelMapRef.current.get(modelName)!;
				modelMapRef.current.set(modelName, {...m, requestCount: m.requestCount + 1});
			} else if (event.type === 'llm.response') {
				const raw = event as Record<string, unknown>;
				const totalTokens = typeof raw['total_tokens'] === 'number' ? raw['total_tokens'] : 0;
				const inputTokens = typeof raw['input_tokens'] === 'number' ? raw['input_tokens'] : 0;
				const outputTokens = typeof raw['output_tokens'] === 'number' ? raw['output_tokens'] : 0;
				const modelName =
					typeof raw['model'] === 'string'
						? raw['model']
						: pendingModelRef.current || 'unknown';

				const model = modelMapRef.current.get(modelName);
				if (model) {
					modelMapRef.current.set(modelName, {
						...model,
						totalTokens: model.totalTokens + totalTokens,
						inputTokens: model.inputTokens + inputTokens,
						outputTokens: model.outputTokens + outputTokens,
					});
				}

				// Update agent LLM stats using ref (no stale closure)
				const agentName = currentAgentNameRef.current;
				const agent = agentMapRef.current.get(agentName);
				if (agent) {
					agentMapRef.current.set(agentName, {
						...agent,
						llmCalls: agent.llmCalls + 1,
						tokens: agent.tokens + totalTokens,
					});
					agentUpdates = [...agentMapRef.current.values()];
				}
				modelUpdates = [...modelMapRef.current.values()];
			}

			// ── Tool tracking ──────────────────────────────────────────────────
			if (event.type === 'tool.start') {
				const raw = event as Record<string, unknown>;
				const toolName = typeof raw['tool_name'] === 'string' ? raw['tool_name'] : 'unknown';

				if (!toolMapRef.current.has(toolName)) {
					toolMapRef.current.set(toolName, {
						name: toolName,
						callCount: 0,
						successCount: 0,
						errorCount: 0,
						avgDurationMs: 0,
						totalDurationMs: 0,
					});
				}
				const t = toolMapRef.current.get(toolName)!;
				toolMapRef.current.set(toolName, {...t, callCount: t.callCount + 1});

				const agentName = currentAgentNameRef.current;
				const agent = agentMapRef.current.get(agentName);
				if (agent) {
					agentMapRef.current.set(agentName, {...agent, toolCalls: agent.toolCalls + 1});
					agentUpdates = [...agentMapRef.current.values()];
				}
				toolUpdates = [...toolMapRef.current.values()];
			} else if (event.type === 'tool.end') {
				const raw = event as Record<string, unknown>;
				const toolName = typeof raw['tool_name'] === 'string' ? raw['tool_name'] : 'unknown';
				const durationMs = typeof raw['duration_ms'] === 'number' ? raw['duration_ms'] : 0;
				const tool = toolMapRef.current.get(toolName);
				if (tool) {
					toolMapRef.current.set(toolName, {
						...tool,
						successCount: tool.successCount + 1,
						totalDurationMs: tool.totalDurationMs + durationMs,
						avgDurationMs:
							(tool.totalDurationMs + durationMs) / (tool.successCount + 1),
					});
					toolUpdates = [...toolMapRef.current.values()];
				}
			} else if (event.type === 'tool.error') {
				const raw = event as Record<string, unknown>;
				const toolName = typeof raw['tool_name'] === 'string' ? raw['tool_name'] : 'unknown';
				const tool = toolMapRef.current.get(toolName);
				if (tool) {
					toolMapRef.current.set(toolName, {...tool, errorCount: tool.errorCount + 1});
				}
				toolUpdates = [...toolMapRef.current.values()];
			}

			// Keep completedEventsRef in sync for firstEventIndex tracking
			if (currentEventRef.current) {
				completedEventsRef.current = [
					...completedEventsRef.current,
					currentEventRef.current,
				];
				if (completedEventsRef.current.length > MAX_EVENTS_BUFFER) {
					completedEventsRef.current = completedEventsRef.current.slice(-MAX_EVENTS_BUFFER);
				}
			}
			currentEventRef.current = event;

			// Single dispatch — one re-render per event
			dispatch({
				type: 'ADD_EVENT',
				event,
				maxBuffer: MAX_EVENTS_BUFFER,
				agentUpdates,
				modelUpdates,
				toolUpdates,
				newCurrentAgentName,
			});
		},
		[paused],
	);

	const {status, runId, error, stats, stop} = useProcessStream(
		script,
		handleEvent,
		{
			maxEventsPerSecond: maxEventsPerSecond ?? config.liveMaxEventsPerSecond,
			burstSize: burstSize ?? config.liveBurstSize,
		},
	);

	// Keyboard handlers
	useKeyboard({
		onPause: () => {
			setPaused(p => !p);
		},
		onQuit: () => {
			stop();
		},
	});

	// Error state
	if (error && status === 'error') {
		return (
			<Box flexDirection="column">
				<Header runId={runId} live status="error" />
				<ErrorDisplay error={error} />
				<StatusBar keys={['q: Quit']} />
			</Box>
		);
	}

	const totalEvents = completedEvents.length + (currentEvent ? 1 : 0);
	const hasMultipleAgents = agents.length > 1;

	return (
		<Box flexDirection="column">
			<Header
				runId={runId}
				live
				status={status}
				paused={paused}
				agentName={
					!hasMultipleAgents && currentAgentName ? currentAgentName : undefined
				}
			/>
			<Summary liveStats={stats} />

			{/* Info panel with models and tools */}
			{(models.length > 0 || tools.length > 0) && (
				<InfoPanel models={models} tools={tools} />
			)}

			{/* Main content area */}
			<Box>
				{/* Agent panel (if multiple agents) */}
				{hasMultipleAgents && (
					<Box marginRight={1}>
						<AgentPanel agents={agents} compact />
					</Box>
				)}

				{/* Events container */}
				<Box
					flexGrow={1}
					borderStyle="round"
					borderColor={colors.border.secondary}
					paddingX={1}
					flexDirection="column"
				>
					{/* Header with title and count */}
					<Box justifyContent="space-between" marginBottom={0}>
						<Text bold color={colors.brand.primary}>
							Live Events
						</Text>
						<Text dimColor>{totalEvents} events</Text>
					</Box>

					{/* Column headers */}
					<Box marginBottom={0}>
						<Text dimColor>
							{'  '}TIME{'        '}EVENT{'           '}DETAILS
						</Text>
					</Box>

					{/* Separator line */}
					<Box marginBottom={0}>
						<Text dimColor>{'─'.repeat(separatorWidth)}</Text>
					</Box>

					{/* Completed events - rendered once via Static */}
					<Static items={completedEvents}>
						{(event, index) => (
							<EventLine
								key={`${event.timestamp}-${index}`}
								event={event}
								baseTimestamp={baseTimestamp}
								isFirst={index === 0}
								isLast={false}
								index={index}
								totalEvents={totalEvents}
							/>
						)}
					</Static>

					{/* Current event - dynamically updated */}
					{currentEvent && (
						<EventLine
							event={currentEvent}
							current
							baseTimestamp={baseTimestamp}
							isFirst={completedEvents.length === 0}
							isLast
							index={completedEvents.length}
							totalEvents={totalEvents}
						/>
					)}

					{/* Running indicator with spinner */}
					{status === 'running' && !currentEvent && (
						<Box marginTop={1}>
							<Spinner type="dots" color="cyan" label="Waiting for events..." />
						</Box>
					)}

					{status === 'running' && currentEvent && (
						<Box marginTop={1}>
							<Spinner type="spinner" color="green" label="Running..." />
						</Box>
					)}

					{status === 'stopped' && (
						<Box marginTop={1}>
							<Text color="blue">Process finished</Text>
						</Box>
					)}
				</Box>
			</Box>

			<StatusBar
				keys={['Ctrl+C: Stop', `p: ${paused ? 'Resume' : 'Pause'}`, 'q: Quit']}
			/>
		</Box>
	);
}

export default TailCommand;
