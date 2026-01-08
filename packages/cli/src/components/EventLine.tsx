/**
 * EventLine component for displaying a single trace event
 *
 * Design: Timeline connector + icon + type + detail + duration bar
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {
	getEventIcon,
	getEventColor,
	formatTimestamp,
	padEnd,
	formatDurationCompact,
	timeline,
} from '../lib/theme.js';
import {getEventDetail} from '../lib/parser.js';

export interface EventLineProps {
	event: TraceEvent;
	selected?: boolean;
	current?: boolean;
	showTimestamp?: boolean;
	baseTimestamp?: number;
	isFirst?: boolean;
	isLast?: boolean;
	totalEvents?: number;
	index?: number;
}

export function EventLine({
	event,
	selected = false,
	current = false,
	showTimestamp = true,
	baseTimestamp,
	isFirst = false,
	isLast = false,
}: EventLineProps): React.ReactElement {
	const icon = getEventIcon(event.type);
	const color = getEventColor(event.type);
	const detail = getEventDetail(event);

	// Calculate relative or absolute timestamp
	const timeStr = showTimestamp
		? baseTimestamp
			? formatTimestamp(event.timestamp, 'relative', baseTimestamp).padStart(10)
			: formatTimestamp(event.timestamp, 'absolute')
		: '';

	// Pad event type for alignment
	const typeStr = padEnd(event.type, 15);

	// Get duration if available (for response/end events)
	const durationMs = (event as {duration_ms?: number}).duration_ms;
	const hasDuration = durationMs !== undefined && durationMs > 0;

	// Get timeline connector
	const getConnector = () => {
		if (isFirst && isLast) return timeline.dot;
		if (isFirst) return timeline.start;
		if (isLast) return timeline.end;
		return timeline.middle;
	};

	const connector = getConnector();

	return (
		<Box>
			{/* Timeline connector */}
			<Text color={selected ? 'cyan' : 'gray'}>
				{selected ? timeline.dot : connector}
			</Text>
			<Text> </Text>

			{/* Timestamp */}
			{showTimestamp && (
				<Text dimColor={!selected && !current}>{timeStr.padEnd(12)}</Text>
			)}

			{/* Event icon */}
			<Text color={color} bold={selected}>
				{icon}
			</Text>
			<Text> </Text>

			{/* Event type */}
			<Text
				bold={current || selected}
				color={selected ? 'white' : current ? 'white' : undefined}
			>
				{typeStr}
			</Text>

			{/* Event details */}
			{detail && <Text dimColor={!current && !selected}> {detail}</Text>}

			{/* Duration for events with duration (simplified - no bar) */}
			{hasDuration && (
				<Text dimColor> [{formatDurationCompact(durationMs)}]</Text>
			)}
		</Box>
	);
}

export default EventLine;
