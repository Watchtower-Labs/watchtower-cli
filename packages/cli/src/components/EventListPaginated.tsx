/**
 * Paginated EventList component for displaying events with page navigation
 *
 * Design: Timeline with connectors, page indicators, and navigation controls
 */

import React from 'react';
import {Box, Text, useInput} from 'ink';
import type {TraceEvent} from '../lib/types.js';
import {EventLine} from './EventLine.js';
import {colors, timeline} from '../lib/theme.js';

export interface EventListPaginatedProps {
	events: TraceEvent[];
	selectedIndex: number;
	page: number;
	totalPages: number;
	totalEvents: number;
	hasNext: boolean;
	hasPrevious: boolean;
	onNext: () => void;
	onPrevious: () => void;
	title?: string;
}

export function EventListPaginated({
	events,
	selectedIndex,
	page,
	totalPages,
	totalEvents,
	hasNext,
	hasPrevious,
	onNext,
	onPrevious,
	title = 'Timeline',
}: EventListPaginatedProps): React.ReactElement {
	// Wire PageDown/PageUp keys to pagination callbacks
	useInput((_input, key) => {
		if (key.pageDown && hasNext) {
			onNext();
		} else if (key.pageUp && hasPrevious) {
			onPrevious();
		}
	});

	// Calculate base timestamp from first event on this page
	const baseTimestamp = events[0]?.timestamp ?? 0;

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

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			{/* Header with title and pagination info */}
			<Box justifyContent="space-between" marginBottom={0}>
				<Text bold color={colors.brand.primary}>
					{title}
				</Text>
				<Text dimColor>
					Page {page + 1}/{totalPages} ({totalEvents} events)
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

			{/* Page navigation indicators */}
			{(hasPrevious || hasNext) && (
				<Box marginBottom={0}>
					{hasPrevious && (
						<Text color="cyan">
							[{timeline.arrowUp}] Previous Page (Page {page})
						</Text>
					)}
					{hasPrevious && hasNext && <Text dimColor> | </Text>}
					{hasNext && (
						<Text color="cyan">
							[{timeline.arrowDown}] Next Page (Page {page + 2})
						</Text>
					)}
				</Box>
			)}

			{/* Event lines */}
			{events.map((event, index) => {
				const globalEventIndex = page * events.length + index;
				const isFirst = globalEventIndex === 0;
				const isLast = globalEventIndex === totalEvents - 1;

				return (
					<EventLine
						key={`${event.timestamp}-${index}`}
						event={event}
						selected={index === selectedIndex}
						baseTimestamp={baseTimestamp}
						isFirst={isFirst}
						isLast={isLast}
						index={globalEventIndex}
						totalEvents={totalEvents}
					/>
				);
			})}

			{/* Footer with keyboard hints */}
			{(hasPrevious || hasNext) && (
				<Box marginTop={0}>
					<Text dimColor>
						{'['}
						<Text bold color="cyan">
							PageUp
						</Text>
						{'/'}
						<Text bold color="cyan">
							PageDown
						</Text>
						{']'} Navigate pages | {'['}
						<Text bold color="cyan">
							↑
						</Text>
						{'/'}
						<Text bold color="cyan">
							↓
						</Text>
						{']'} Select events
					</Text>
				</Box>
			)}
		</Box>
	);
}

export default EventListPaginated;
