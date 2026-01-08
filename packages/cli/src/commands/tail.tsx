/**
 * Tail command - Run a script and stream events live
 *
 * Design: Enhanced live streaming view with agent tracking
 */

import React, {useState, useCallback, useRef} from 'react';
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

// Maximum number of events to keep in memory to prevent unbounded growth
const MAX_EVENTS_BUFFER = 500;

export interface TailCommandProps {
	script: string[];
}

export function TailCommand({script}: TailCommandProps): React.ReactElement {
	const [paused, setPaused] = useState(false);
	const [completedEvents, setCompletedEvents] = useState<TraceEvent[]>([]);
	const [currentEvent, setCurrentEvent] = useState<TraceEvent | null>(null);
	const [baseTimestamp, setBaseTimestamp] = useState<number>(0);
	const baseTimestampRef = useRef<number>(0);
	const terminalSize = useTerminalSize();
	const separatorWidth = Math.max(40, terminalSize.columns - 6);

	// Track agents, models, tools in real-time
	const agentMapRef = useRef<Map<string, AgentInfo>>(new Map());
	const modelMapRef = useRef<Map<string, ModelInfo>>(new Map());
	const toolMapRef = useRef<Map<string, ToolInfo>>(new Map());
	const pendingModelRef = useRef<string>(''); // Track which model is awaiting response
	const [agents, setAgents] = useState<AgentInfo[]>([]);
	const [models, setModels] = useState<ModelInfo[]>([]);
	const [tools, setTools] = useState<ToolInfo[]>([]);
	const [currentAgentName, setCurrentAgentName] = useState<string>('');

	// Handle incoming events
	const handleEvent = useCallback(
		(event: TraceEvent) => {
			if (paused) return;

			// Set base timestamp from first event using ref to avoid stale closure
			if (baseTimestampRef.current === 0) {
				baseTimestampRef.current = event.timestamp;
				setBaseTimestamp(event.timestamp);
			}

			// Update agent tracking
			if (event.type === 'run.start') {
				const e = event as {agent_name?: string};
				const agentName = e.agent_name ?? 'unknown';
				setCurrentAgentName(agentName);

				if (!agentMapRef.current.has(agentName)) {
					agentMapRef.current.set(agentName, {
						name: agentName,
						eventCount: 0,
						toolCalls: 0,
						llmCalls: 0,
						tokens: 0,
						isActive: true,
						firstEventIndex: completedEvents.length,
						lastEventIndex: completedEvents.length,
					});
				}

				// Mark all other agents as inactive
				for (const [name, agent] of agentMapRef.current.entries()) {
					agentMapRef.current.set(name, {
						...agent,
						isActive: name === agentName,
					});
				}
			} else if (event.type === 'agent.transfer') {
				const e = event as {from_agent?: string; to_agent?: string};
				const toAgent = e.to_agent ?? 'unknown';
				setCurrentAgentName(toAgent);

				if (!agentMapRef.current.has(toAgent)) {
					agentMapRef.current.set(toAgent, {
						name: toAgent,
						eventCount: 0,
						toolCalls: 0,
						llmCalls: 0,
						tokens: 0,
						isActive: true,
						firstEventIndex: completedEvents.length,
						lastEventIndex: completedEvents.length,
					});
				}

				// Mark all agents as inactive except target
				for (const [name, agent] of agentMapRef.current.entries()) {
					agentMapRef.current.set(name, {
						...agent,
						isActive: name === toAgent,
					});
				}
			}

			// Update model tracking
			if (event.type === 'llm.request') {
				const e = event as {model?: string};
				const modelName = e.model ?? 'unknown';

				// Track which model is pending response
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

				const model = modelMapRef.current.get(modelName)!;
				modelMapRef.current.set(modelName, {
					...model,
					requestCount: model.requestCount + 1,
				});
			} else if (event.type === 'llm.response') {
				const e = event as {
					total_tokens?: number;
					input_tokens?: number;
					output_tokens?: number;
					model?: string;
				};

				// Use model from response if available, otherwise use pending model
				const modelName = e.model ?? pendingModelRef.current ?? 'unknown';
				const model = modelMapRef.current.get(modelName);

				if (model) {
					modelMapRef.current.set(modelName, {
						...model,
						totalTokens: model.totalTokens + (e.total_tokens ?? 0),
						inputTokens: model.inputTokens + (e.input_tokens ?? 0),
						outputTokens: model.outputTokens + (e.output_tokens ?? 0),
					});
				}

				// Update current agent LLM count
				const agent = agentMapRef.current.get(currentAgentName);
				if (agent) {
					agentMapRef.current.set(currentAgentName, {
						...agent,
						llmCalls: agent.llmCalls + 1,
						tokens: agent.tokens + (e.total_tokens ?? 0),
					});
				}
			}

			// Update tool tracking
			if (event.type === 'tool.start') {
				const e = event as {tool_name?: string};
				const toolName = e.tool_name ?? 'unknown';

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

				const tool = toolMapRef.current.get(toolName)!;
				toolMapRef.current.set(toolName, {
					...tool,
					callCount: tool.callCount + 1,
				});

				// Update current agent tool count
				const agent = agentMapRef.current.get(currentAgentName);
				if (agent) {
					agentMapRef.current.set(currentAgentName, {
						...agent,
						toolCalls: agent.toolCalls + 1,
					});
				}
			} else if (event.type === 'tool.end') {
				const e = event as {tool_name?: string; duration_ms?: number};
				const toolName = e.tool_name ?? 'unknown';
				const tool = toolMapRef.current.get(toolName);
				if (tool) {
					toolMapRef.current.set(toolName, {
						...tool,
						successCount: tool.successCount + 1,
						totalDurationMs: tool.totalDurationMs + (e.duration_ms ?? 0),
						avgDurationMs:
							(tool.totalDurationMs + (e.duration_ms ?? 0)) /
							(tool.successCount + 1),
					});
				}
			} else if (event.type === 'tool.error') {
				const e = event as {tool_name?: string};
				const toolName = e.tool_name ?? 'unknown';
				const tool = toolMapRef.current.get(toolName);
				if (tool) {
					toolMapRef.current.set(toolName, {
						...tool,
						errorCount: tool.errorCount + 1,
					});
				}
			}

			// Update state arrays
			setAgents([...agentMapRef.current.values()]);
			setModels([...modelMapRef.current.values()]);
			setTools([...toolMapRef.current.values()]);

			// Move current event to completed using functional updater
			// Limit buffer size to prevent memory leak
			setCurrentEvent(prev => {
				if (prev) {
					setCompletedEvents(events => {
						const newEvents = [...events, prev];
						// Keep only the last MAX_EVENTS_BUFFER events
						if (newEvents.length > MAX_EVENTS_BUFFER) {
							return newEvents.slice(-MAX_EVENTS_BUFFER);
						}
						return newEvents;
					});
				}
				return event;
			});
		},
		[paused, currentAgentName, completedEvents.length],
	);

	const {status, runId, error, stats, stop} = useProcessStream(
		script,
		handleEvent,
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
