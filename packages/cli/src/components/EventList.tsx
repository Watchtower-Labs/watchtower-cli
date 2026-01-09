/**
 * EventList component for displaying a scrollable list of events
 *
 * Design: Timeline with connectors, scroll indicators, and event counter
 */

import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {EventLine} from './EventLine.js';
import {colors, timeline} from '../lib/theme.js';

export interface EventListProps {
	events: TraceEvent[];
	selectedIndex: number;
	maxVisible?: number;
	title?: string;
}

export function EventList({
	events,
	selectedIndex,
	maxVisible = 15,
	title = 'Timeline',
}: EventListProps): React.ReactElement {
	// Calculate the window of visible events
	const {visibleEvents, startIndex, baseTimestamp} = useMemo(() => {
		if (events.length === 0) {
			return {visibleEvents: [], startIndex: 0, baseTimestamp: 0};
		}

		// Get base timestamp from first event
		const base = events[0]?.timestamp ?? 0;

		// Calculate window bounds
		const halfWindow = Math.floor(maxVisible / 2);
		let start = Math.max(0, selectedIndex - halfWindow);
		const end = Math.min(events.length, start + maxVisible);

		// Adjust start if we're at the end
		if (end === events.length) {
			start = Math.max(0, end - maxVisible);
		}

		return {
			visibleEvents: events.slice(start, end),
			startIndex: start,
			baseTimestamp: base,
		};
	}, [events, selectedIndex, maxVisible]);

	if (events.length === 0) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
			>
				<Box justifyContent="space-between">
					<Text bold color={colors.brand.primary}>
						{title}
					</Text>
				</Box>
				<Box marginTop={1}>
					<Text dimColor>No events to display</Text>
				</Box>
			</Box>
		);
	}

	const showScrollUp = startIndex > 0;
	const showScrollDown = startIndex + visibleEvents.length < events.length;
	const aboveCount = startIndex;
	const belowCount = events.length - (startIndex + visibleEvents.length);

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			{/* Header with title and count */}
			<Box justifyContent="space-between" marginBottom={0}>
				<Text bold color={colors.brand.primary}>
					{title}
				</Text>
				<Text dimColor>
					{selectedIndex + 1}/{events.length}
				</Text>
			</Box>

			{/* Column headers */}
			<Box marginBottom={0}>
				<Text dimColor>
					{'  '}TIME{'        '}EVENT{'           '}DETAILS
				</Text>
			</Box>

			{/* Separator line */}
			<Box marginBottom={0}>
				<Text dimColor>{'─'.repeat(60)}</Text>
			</Box>

			{/* Scroll up indicator */}
			{showScrollUp && (
				<Box>
					<Text color="cyan">{timeline.line}</Text>
					<Text dimColor> ↑ {aboveCount} more above</Text>
				</Box>
			)}

			{/* Event lines */}
			{visibleEvents.map((event, index) => {
				const actualIndex = startIndex + index;
				const isFirst = actualIndex === 0;
				const isLast = actualIndex === events.length - 1;

				return (
					<EventLine
						key={`${event.timestamp}-${actualIndex}`}
						event={event}
						selected={actualIndex === selectedIndex}
						baseTimestamp={baseTimestamp}
						isFirst={isFirst}
						isLast={isLast}
						index={actualIndex}
						totalEvents={events.length}
					/>
				);
			})}

			{/* Scroll down indicator */}
			{showScrollDown && (
				<Box>
					<Text color="cyan">{timeline.line}</Text>
					<Text dimColor> ↓ {belowCount} more below</Text>
				</Box>
			)}
		</Box>
	);
}

export default EventList;
