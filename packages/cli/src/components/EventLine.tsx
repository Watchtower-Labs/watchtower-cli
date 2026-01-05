/**
 * EventLine component for displaying a single trace event
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {
	getEventIcon,
	getEventColor,
	formatTimestamp,
	padEnd,
} from '../lib/theme.js';
import {getEventDetail} from '../lib/parser.js';

export interface EventLineProps {
	event: TraceEvent;
	selected?: boolean;
	current?: boolean;
	showTimestamp?: boolean;
	baseTimestamp?: number;
}

export function EventLine({
	event,
	selected = false,
	current = false,
	showTimestamp = true,
	baseTimestamp,
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

	return (
		<Box>
			{/* Selection indicator */}
			<Text color={selected ? 'cyan' : undefined}>
				{selected ? '\u25B6 ' : '  '}
			</Text>

			{/* Timestamp */}
			{showTimestamp && <Text dimColor={!current}>{timeStr.padEnd(14)}</Text>}

			{/* Event icon */}
			<Text color={color}>{icon}</Text>
			<Text> </Text>

			{/* Event type */}
			<Text bold={current} color={current ? 'white' : undefined}>
				{typeStr}
			</Text>

			{/* Event details */}
			{detail && <Text dimColor={!current}> {detail}</Text>}
		</Box>
	);
}

export default EventLine;
