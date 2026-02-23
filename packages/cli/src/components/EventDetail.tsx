/**
 * EventDetail component for displaying expanded event information
 *
 * Design: Clean sections with visual hierarchy and syntax highlighting
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {
	getEventIcon,
	getEventColor,
	formatTimestamp,
	formatDuration,
	formatTokens,
	createDurationBar,
	colors,
} from '../lib/theme.js';

export interface EventDetailProps {
	event: TraceEvent;
}

// Section header component
function SectionHeader({title}: {title: string}): React.ReactElement {
	return (
		<Box marginTop={1} marginBottom={0}>
			<Text bold color={colors.brand.secondary}>
				{title}
			</Text>
		</Box>
	);
}

// Detail row component with consistent formatting
function DetailRow({
	label,
	value,
	color,
	icon,
}: {
	label: string;
	value: string | number | undefined;
	color?: string;
	icon?: string;
}): React.ReactElement | null {
	if (value === undefined || value === '') {
		return null;
	}

	return (
		<Box>
			<Text dimColor>{icon ? `${icon} ` : '  '}</Text>
			<Text dimColor>{label.padEnd(14)}: </Text>
			<Text color={color} bold={Boolean(color)}>
				{String(value)}
			</Text>
		</Box>
	);
}

// Code block component for JSON/code display
function CodeBlock({
	content,
	maxLines = 15,
}: {
	content: string;
	maxLines?: number;
}): React.ReactElement {
	const lines = content.split('\n');
	const truncated = lines.length > maxLines;
	const displayLines = truncated ? lines.slice(0, maxLines) : lines;

	return (
		<Box flexDirection="column" marginLeft={2}>
			<Text color="gray">{'┌' + '─'.repeat(50)}</Text>
			{displayLines.map((line, i) => (
				<Text key={i} color="gray">
					│ <Text color="white">{line}</Text>
				</Text>
			))}
			{truncated && (
				<Text color="gray">
					│ <Text dimColor>... {lines.length - maxLines} more lines</Text>
				</Text>
			)}
			<Text color="gray">{'└' + '─'.repeat(50)}</Text>
		</Box>
	);
}

// Token stats component
function TokenStats({
	input,
	output,
	total,
}: {
	input?: number;
	output?: number;
	total?: number;
}): React.ReactElement | null {
	if (!total) return null;

	return (
		<Box flexDirection="column" marginLeft={2}>
			<Box>
				<Text dimColor>Input: </Text>
				<Text color="cyan">{formatTokens(input ?? 0)}</Text>
			</Box>
			<Box>
				<Text dimColor>Output: </Text>
				<Text color="magenta">{formatTokens(output ?? 0)}</Text>
			</Box>
			<Box>
				<Text dimColor>Total: </Text>
				<Text bold color="white">
					{formatTokens(total)}
				</Text>
			</Box>
		</Box>
	);
}

export function EventDetail({event}: EventDetailProps): React.ReactElement {
	const icon = getEventIcon(event.type);
	const color = getEventColor(event.type);

	return (
		<Box
			borderStyle="round"
			borderColor={color}
			paddingX={1}
			flexDirection="column"
		>
			{/* Header with event type */}
			<Box marginBottom={1}>
				<Text color={color} bold>
					{icon} {event.type.toUpperCase()}
				</Text>
			</Box>

			{/* Common fields */}
			<DetailRow label="Run ID" value={event.run_id} icon="◆" />
			<DetailRow
				label="Timestamp"
				value={formatTimestamp(event.timestamp, 'absolute')}
				icon="⏱"
			/>

			{/* Type-specific fields */}
			{renderTypeSpecificFields(event)}

			{/* Raw JSON (collapsible hint) */}
			<SectionHeader title="Raw Event" />
			<CodeBlock content={JSON.stringify(event, null, 2)} />
		</Box>
	);
}

function renderTypeSpecificFields(
	event: TraceEvent,
): React.ReactElement | null {
	switch (event.type) {
		case 'run.start': {
			const e = event as {invocation_id?: string; agent_name?: string};
			return (
				<>
					<DetailRow
						label="Agent"
						value={e.agent_name}
						icon="🤖"
						color="cyan"
					/>
					<DetailRow label="Invocation ID" value={e.invocation_id} icon="◈" />
				</>
			);
		}

		case 'run.end': {
			const e = event as {
				duration_ms?: number;
				summary?: Record<string, unknown>;
			};
			return (
				<>
					{e.duration_ms && (
						<Box>
							<Text dimColor>⏱ Duration : </Text>
							<Text bold color="cyan">
								{formatDuration(e.duration_ms)}
							</Text>
							<Text dimColor>
								{' '}
								{createDurationBar(e.duration_ms, 10000, 15)}
							</Text>
						</Box>
					)}
					{e.summary && (
						<>
							<SectionHeader title="Summary" />
							<Box flexDirection="column" marginLeft={2}>
								{(() => {
									const llm = (e.summary?.['llm_calls'] ?? 0) as number;
									const tool = (e.summary?.['tool_calls'] ?? 0) as number;
									const tokens = (e.summary?.['total_tokens'] ?? 0) as number;
									const errors = (e.summary?.['errors'] ?? 0) as number;
									return (
										<>
											<DetailRow
												label="LLM Calls"
												value={llm}
												color="magenta"
											/>
											<DetailRow
												label="Tool Calls"
												value={tool}
												color="yellow"
											/>
											<DetailRow
												label="Total Tokens"
												value={formatTokens(tokens)}
												color="cyan"
											/>
											<DetailRow
												label="Errors"
												value={errors}
												color={errors > 0 ? 'red' : 'green'}
											/>
										</>
									);
								})()}
							</Box>
						</>
					)}
				</>
			);
		}

		case 'llm.request': {
			const e = event as {
				request_id?: string;
				model?: string;
				message_count?: number;
				tools_available?: string[] | number;
			};
			const toolCount = Array.isArray(e.tools_available)
				? e.tools_available.length
				: e.tools_available;
			return (
				<>
					<DetailRow label="Request ID" value={e.request_id} icon="◈" />
					<DetailRow label="Model" value={e.model} icon="🤖" color="magenta" />
					<DetailRow label="Messages" value={e.message_count} icon="💬" />
					<DetailRow label="Tools" value={toolCount} icon="⚡" />
					{Array.isArray(e.tools_available) && e.tools_available.length > 0 && (
						<>
							<SectionHeader title="Available Tools" />
							<Box marginLeft={2}>
								<Text color="yellow">{e.tools_available.join(', ')}</Text>
							</Box>
						</>
					)}
				</>
			);
		}

		case 'llm.response': {
			const e = event as {
				request_id?: string;
				duration_ms?: number;
				input_tokens?: number;
				output_tokens?: number;
				total_tokens?: number;
				has_tool_calls?: boolean;
				finish_reason?: string;
			};
			return (
				<>
					<DetailRow label="Request ID" value={e.request_id} icon="◈" />
					{e.duration_ms && (
						<Box>
							<Text dimColor>⏱ Duration : </Text>
							<Text bold color="cyan">
								{formatDuration(e.duration_ms)}
							</Text>
							<Text dimColor>
								{' '}
								{createDurationBar(e.duration_ms, 5000, 15)}
							</Text>
						</Box>
					)}
					<SectionHeader title="Token Usage" />
					<TokenStats
						input={e.input_tokens}
						output={e.output_tokens}
						total={e.total_tokens}
					/>
					<DetailRow
						label="Tool Calls"
						value={e.has_tool_calls ? 'Yes' : 'No'}
						icon="⚡"
						color={e.has_tool_calls ? 'yellow' : undefined}
					/>
					<DetailRow label="Finish" value={e.finish_reason} icon="✔" />
				</>
			);
		}

		case 'tool.start': {
			const e = event as {
				tool_call_id?: string;
				tool_name?: string;
				tool_args?: Record<string, unknown>;
				agent_name?: string;
			};
			return (
				<>
					<DetailRow
						label="Tool"
						value={e.tool_name}
						icon="⚡"
						color="yellow"
					/>
					<DetailRow label="Call ID" value={e.tool_call_id} icon="◈" />
					<DetailRow label="Agent" value={e.agent_name} icon="🤖" />
					{e.tool_args && Object.keys(e.tool_args).length > 0 && (
						<>
							<SectionHeader title="Arguments" />
							<CodeBlock
								content={JSON.stringify(e.tool_args, null, 2)}
								maxLines={10}
							/>
						</>
					)}
				</>
			);
		}

		case 'tool.end': {
			const e = event as {
				tool_call_id?: string;
				tool_name?: string;
				duration_ms?: number;
				response_preview?: string;
				success?: boolean;
			};
			return (
				<>
					<DetailRow
						label="Tool"
						value={e.tool_name}
						icon="⚡"
						color="yellow"
					/>
					<DetailRow label="Call ID" value={e.tool_call_id} icon="◈" />
					{e.duration_ms && (
						<Box>
							<Text dimColor>⏱ Duration : </Text>
							<Text bold color="cyan">
								{formatDuration(e.duration_ms)}
							</Text>
							<Text dimColor>
								{' '}
								{createDurationBar(e.duration_ms, 2000, 15)}
							</Text>
						</Box>
					)}
					{e.success !== undefined && (
						<DetailRow
							label="Status"
							value={e.success ? '✔ Success' : '✖ Failed'}
							icon={e.success ? '✔' : '✖'}
							color={e.success ? 'green' : 'red'}
						/>
					)}
					{e.response_preview && (
						<>
							<SectionHeader title="Response Preview" />
							<CodeBlock content={e.response_preview} maxLines={8} />
						</>
					)}
				</>
			);
		}

		case 'tool.error': {
			const e = event as {
				tool_call_id?: string;
				tool_name?: string;
				error_type?: string;
				error_message?: string;
			};
			return (
				<>
					<DetailRow
						label="Tool"
						value={e.tool_name}
						icon="⚡"
						color="yellow"
					/>
					<DetailRow label="Call ID" value={e.tool_call_id} icon="◈" />
					<DetailRow
						label="Error Type"
						value={e.error_type}
						icon="✖"
						color="red"
					/>
					{e.error_message && (
						<>
							<SectionHeader title="Error Message" />
							<Box marginLeft={2}>
								<Text color="red">{e.error_message}</Text>
							</Box>
						</>
					)}
				</>
			);
		}

		case 'state.change': {
			const e = event as {
				author?: string;
				state_delta?: Record<string, unknown>;
			};
			return (
				<>
					<DetailRow label="Author" value={e.author} icon="👤" />
					{e.state_delta && Object.keys(e.state_delta).length > 0 && (
						<>
							<SectionHeader title="State Changes" />
							<CodeBlock
								content={JSON.stringify(e.state_delta, null, 2)}
								maxLines={10}
							/>
						</>
					)}
				</>
			);
		}

		case 'agent.transfer': {
			const e = event as {
				from_agent?: string;
				to_agent?: string;
				reason?: string;
			};
			return (
				<>
					<Box>
						<Text dimColor>🤖 Transfer : </Text>
						<Text color="cyan">{e.from_agent}</Text>
						<Text dimColor> → </Text>
						<Text color="magenta">{e.to_agent}</Text>
					</Box>
					{e.reason && (
						<>
							<SectionHeader title="Reason" />
							<Box marginLeft={2}>
								<Text>{e.reason}</Text>
							</Box>
						</>
					)}
				</>
			);
		}

		default:
			return null;
	}
}

export default EventDetail;
