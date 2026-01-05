/**
 * EventList component for displaying a scrollable list of events
 */

import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {EventLine} from './EventLine.js';

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
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				flexDirection="column"
			>
				<Text bold>{title}</Text>
				<Text dimColor>No events</Text>
			</Box>
		);
	}

	const showScrollUp = startIndex > 0;
	const showScrollDown = startIndex + visibleEvents.length < events.length;

	return (
		<Box
			borderStyle="single"
			borderColor="gray"
			paddingX={1}
			flexDirection="column"
		>
			{/* Title with scroll indicators */}
			<Box justifyContent="space-between">
				<Text bold>{title}</Text>
				<Text dimColor>
					{events.length} event{events.length !== 1 ? 's' : ''}
				</Text>
			</Box>

			{/* Scroll up indicator */}
			{showScrollUp && (
				<Text dimColor>
					{' '}
					{'\u2191'} {startIndex} more above
				</Text>
			)}

			{/* Event lines */}
			{visibleEvents.map((event, index) => {
				const actualIndex = startIndex + index;
				return (
					<EventLine
						key={`${event.timestamp}-${actualIndex}`}
						event={event}
						selected={actualIndex === selectedIndex}
						baseTimestamp={baseTimestamp}
					/>
				);
			})}

			{/* Scroll down indicator */}
			{showScrollDown && (
				<Text dimColor>
					{' '}
					{'\u2193'} {events.length - (startIndex + visibleEvents.length)} more
					below
				</Text>
			)}
		</Box>
	);
}

export default EventList;
