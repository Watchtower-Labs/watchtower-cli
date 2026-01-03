/**
 * EventDetail component for displaying expanded event information
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
} from '../lib/theme.js';

export interface EventDetailProps {
	event: TraceEvent;
}

export function EventDetail({event}: EventDetailProps): React.ReactElement {
	const icon = getEventIcon(event.type);
	const color = getEventColor(event.type);

	return (
		<Box
			borderStyle="single"
			borderColor="gray"
			paddingX={1}
			flexDirection="column"
		>
			{/* Header */}
			<Box marginBottom={1}>
				<Text color={color} bold>
					{icon} {event.type}
				</Text>
			</Box>

			{/* Common fields */}
			<DetailRow label="Run ID" value={event.run_id} />
			<DetailRow
				label="Timestamp"
				value={formatTimestamp(event.timestamp, 'absolute')}
			/>

			{/* Type-specific fields */}
			{renderTypeSpecificFields(event)}

			{/* Raw JSON (collapsed by default) */}
			<Box marginTop={1} flexDirection="column">
				<Text dimColor bold>
					Raw Event:
				</Text>
				<Text dimColor>{JSON.stringify(event, null, 2)}</Text>
			</Box>
		</Box>
	);
}

function DetailRow({
	label,
	value,
	color,
}: {
	label: string;
	value: string | number | undefined;
	color?: string;
}): React.ReactElement | null {
	if (value === undefined || value === '') {
		return null;
	}

	return (
		<Box>
			<Text dimColor>{label}: </Text>
			<Text color={color}>{String(value)}</Text>
		</Box>
	);
}

function renderTypeSpecificFields(event: TraceEvent): React.ReactElement | null {
	switch (event.type) {
		case 'run.start': {
			const e = event as {invocation_id?: string; agent_name?: string};
			return (
				<>
					<DetailRow label="Agent" value={e.agent_name} />
					<DetailRow label="Invocation ID" value={e.invocation_id} />
				</>
			);
		}

		case 'run.end': {
			const e = event as {duration_ms?: number; summary?: Record<string, unknown>};
			return (
				<>
					<DetailRow
						label="Duration"
						value={e.duration_ms ? formatDuration(e.duration_ms) : undefined}
					/>
					{e.summary && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								Summary:
							</Text>
							<Box paddingLeft={2} flexDirection="column">
								<DetailRow
									label="LLM Calls"
									value={e.summary['llm_calls'] as number}
								/>
								<DetailRow
									label="Tool Calls"
									value={e.summary['tool_calls'] as number}
								/>
								<DetailRow
									label="Total Tokens"
									value={formatTokens(e.summary['total_tokens'] as number)}
								/>
								<DetailRow
									label="Errors"
									value={e.summary['errors'] as number}
									color={(e.summary['errors'] as number) > 0 ? 'red' : undefined}
								/>
							</Box>
						</Box>
					)}
				</>
			);
		}

		case 'llm.request': {
			const e = event as {
				request_id?: string;
				model?: string;
				message_count?: number;
				tools_available?: string[];
			};
			return (
				<>
					<DetailRow label="Request ID" value={e.request_id} />
					<DetailRow label="Model" value={e.model} />
					<DetailRow label="Messages" value={e.message_count} />
					{e.tools_available && e.tools_available.length > 0 && (
						<Box flexDirection="column">
							<Text dimColor>Tools Available: </Text>
							<Box paddingLeft={2}>
								<Text>{e.tools_available.join(', ')}</Text>
							</Box>
						</Box>
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
					<DetailRow label="Request ID" value={e.request_id} />
					<DetailRow
						label="Duration"
						value={e.duration_ms ? formatDuration(e.duration_ms) : undefined}
					/>
					<DetailRow
						label="Input Tokens"
						value={e.input_tokens ? formatTokens(e.input_tokens) : undefined}
					/>
					<DetailRow
						label="Output Tokens"
						value={e.output_tokens ? formatTokens(e.output_tokens) : undefined}
					/>
					<DetailRow
						label="Total Tokens"
						value={e.total_tokens ? formatTokens(e.total_tokens) : undefined}
					/>
					<DetailRow
						label="Has Tool Calls"
						value={e.has_tool_calls ? 'Yes' : 'No'}
					/>
					<DetailRow label="Finish Reason" value={e.finish_reason} />
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
					<DetailRow label="Tool" value={e.tool_name} />
					<DetailRow label="Tool Call ID" value={e.tool_call_id} />
					<DetailRow label="Agent" value={e.agent_name} />
					{e.tool_args && Object.keys(e.tool_args).length > 0 && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								Arguments:
							</Text>
							<Box paddingLeft={2}>
								<Text>{JSON.stringify(e.tool_args, null, 2)}</Text>
							</Box>
						</Box>
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
					<DetailRow label="Tool" value={e.tool_name} />
					<DetailRow label="Tool Call ID" value={e.tool_call_id} />
					<DetailRow
						label="Duration"
						value={e.duration_ms ? formatDuration(e.duration_ms) : undefined}
					/>
					<DetailRow
						label="Success"
						value={e.success ? 'Yes' : 'No'}
						color={e.success ? 'green' : 'red'}
					/>
					{e.response_preview && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								Response Preview:
							</Text>
							<Box paddingLeft={2}>
								<Text>{e.response_preview}</Text>
							</Box>
						</Box>
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
					<DetailRow label="Tool" value={e.tool_name} />
					<DetailRow label="Tool Call ID" value={e.tool_call_id} />
					<DetailRow label="Error Type" value={e.error_type} color="red" />
					{e.error_message && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								Error Message:
							</Text>
							<Box paddingLeft={2}>
								<Text color="red">{e.error_message}</Text>
							</Box>
						</Box>
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
					<DetailRow label="Author" value={e.author} />
					{e.state_delta && Object.keys(e.state_delta).length > 0 && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								State Changes:
							</Text>
							<Box paddingLeft={2}>
								<Text>{JSON.stringify(e.state_delta, null, 2)}</Text>
							</Box>
						</Box>
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
					<DetailRow label="From Agent" value={e.from_agent} />
					<DetailRow label="To Agent" value={e.to_agent} />
					{e.reason && (
						<Box flexDirection="column" marginTop={1}>
							<Text dimColor bold>
								Reason:
							</Text>
							<Box paddingLeft={2}>
								<Text>{e.reason}</Text>
							</Box>
						</Box>
					)}
				</>
			);
		}

		default:
			return null;
	}
}

export default EventDetail;
