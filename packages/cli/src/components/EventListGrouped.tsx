/**
 * EventListGrouped component - Timeline with agent grouping
 *
 * Design: Events grouped by agent with transfer indicators
 */

import React, {useMemo} from 'react';
import {Box, Text} from 'ink';
import type {TraceEvent, AgentEventGroup} from '../lib/types.js';
import {EventLine} from './EventLine.js';
import {colors, timeline, box} from '../lib/theme.js';
import {useTerminalSize} from '../hooks/useTerminalSize.js';

export interface EventListGroupedProps {
	events: TraceEvent[];
	eventGroups: AgentEventGroup[];
	selectedIndex: number;
	maxVisible?: number;
	hasMultipleAgents: boolean;
}

export function EventListGrouped({
	events,
	eventGroups,
	selectedIndex,
	maxVisible = 15,
	hasMultipleAgents,
}: EventListGroupedProps): React.ReactElement {
	const terminalSize = useTerminalSize();
	// Calculate responsive width for separators (leave room for borders and padding)
	const separatorWidth = Math.max(40, terminalSize.columns - 6);

	// Calculate visible window centered on selection
	const {visibleEvents, startIndex, baseTimestamp, visibleGroups} =
		useMemo(() => {
			if (events.length === 0) {
				return {
					visibleEvents: [],
					startIndex: 0,
					baseTimestamp: 0,
					visibleGroups: [],
				};
			}

			const base = events[0]?.timestamp ?? 0;

			// Calculate window bounds
			const halfWindow = Math.floor(maxVisible / 2);
			let start = Math.max(0, selectedIndex - halfWindow);
			const end = Math.min(events.length, start + maxVisible);

			if (end === events.length) {
				start = Math.max(0, end - maxVisible);
			}

			// Find which groups are visible
			const groups: Array<{
				group: AgentEventGroup;
				visibleEvents: TraceEvent[];
				visibleStartIndex: number; // Index of first visible event in full events array
				groupStartsInView: boolean;
				groupEndsInView: boolean;
			}> = [];

			for (const group of eventGroups) {
				// Check if group overlaps with visible range
				if (group.endIndex >= start && group.startIndex < end) {
					const visibleStart = Math.max(group.startIndex, start);
					const visibleEnd = Math.min(group.endIndex + 1, end);

					groups.push({
						group,
						visibleEvents: events.slice(visibleStart, visibleEnd),
						visibleStartIndex: visibleStart, // Track actual start index
						groupStartsInView: group.startIndex >= start,
						groupEndsInView: group.endIndex < end,
					});
				}
			}

			return {
				visibleEvents: events.slice(start, end),
				startIndex: start,
				baseTimestamp: base,
				visibleGroups: groups,
			};
		}, [events, eventGroups, selectedIndex, maxVisible]);

	if (events.length === 0) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
			>
				<Text bold color={colors.brand.primary}>
					Timeline
				</Text>
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

	// If no multiple agents, render simple list
	if (!hasMultipleAgents) {
		return (
			<Box
				borderStyle="round"
				borderColor={colors.border.secondary}
				paddingX={1}
				flexDirection="column"
			>
				<Box justifyContent="space-between" marginBottom={0}>
					<Text bold color={colors.brand.primary}>
						Timeline
					</Text>
					<Text dimColor>
						{selectedIndex + 1}/{events.length}
					</Text>
				</Box>

				<Box marginBottom={0}>
					<Text dimColor>
						{'  '}TIME{'        '}EVENT{'           '}DETAILS
					</Text>
				</Box>

				<Text dimColor>{'─'.repeat(separatorWidth)}</Text>

				{showScrollUp && (
					<Box>
						<Text color="cyan">{timeline.line}</Text>
						<Text dimColor>
							{' '}
							{box.single.teeDown} {aboveCount} more above
						</Text>
					</Box>
				)}

				{visibleEvents.map((event, index) => {
					const actualIndex = startIndex + index;
					return (
						<EventLine
							key={`${event.timestamp}-${actualIndex}`}
							event={event}
							selected={actualIndex === selectedIndex}
							baseTimestamp={baseTimestamp}
							isFirst={actualIndex === 0}
							isLast={actualIndex === events.length - 1}
							index={actualIndex}
							totalEvents={events.length}
						/>
					);
				})}

				{showScrollDown && (
					<Box>
						<Text color="cyan">{timeline.line}</Text>
						<Text dimColor>
							{' '}
							{box.single.teeUp} {belowCount} more below
						</Text>
					</Box>
				)}
			</Box>
		);
	}

	// Multi-agent grouped view
	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			flexDirection="column"
		>
			<Box justifyContent="space-between" marginBottom={0}>
				<Text bold color={colors.brand.primary}>
					Timeline
				</Text>
				<Text dimColor>
					{selectedIndex + 1}/{events.length}
				</Text>
			</Box>

			<Text dimColor>{'─'.repeat(separatorWidth)}</Text>

			{showScrollUp && (
				<Box>
					<Text color="cyan">{timeline.line}</Text>
					<Text dimColor>
						{' '}
						{box.single.teeDown} {aboveCount} more above
					</Text>
				</Box>
			)}

			{visibleGroups.map(
				(
					{
						group,
						visibleEvents: groupEvents,
						visibleStartIndex,
						groupStartsInView,
					},
					groupIdx,
				) => (
					<React.Fragment key={`${group.agentName}-${groupIdx}`}>
						{/* Agent transfer indicator */}
						{group.agentName === '__transfer__' ? (
							<AgentTransferLine
								event={groupEvents[0]!}
								baseTimestamp={baseTimestamp}
								selected={group.startIndex === selectedIndex}
							/>
						) : (
							<>
								{/* Agent section header (only if group starts in view) */}
								{groupStartsInView && (
									<Box>
										<Text color="cyan">{box.single.topLeft} </Text>
										<Text bold color="cyan">
											{group.agentName}
										</Text>
										<Text color="cyan">
											{' '}
											{'─'.repeat(
												Math.max(
													0,
													separatorWidth - 4 - group.agentName.length,
												),
											)}
										</Text>
									</Box>
								)}

								{/* Events in this group */}
								{groupEvents.map((event, index) => {
									// Calculate actual index in full events array (O(1) instead of O(n))
									const eventIndex = visibleStartIndex + index;

									return (
										<Box key={`${event.timestamp}-${eventIndex}`}>
											<Text color="cyan">{timeline.line}</Text>
											<EventLine
												event={event}
												selected={eventIndex === selectedIndex}
												baseTimestamp={baseTimestamp}
												isFirst={index === 0 && groupStartsInView}
												isLast={
													eventIndex === group.endIndex &&
													group.endIndex === events.length - 1
												}
												index={eventIndex}
												totalEvents={events.length}
												showTimestamp
											/>
										</Box>
									);
								})}
							</>
						)}
					</React.Fragment>
				),
			)}

			{showScrollDown && (
				<Box>
					<Text color="cyan">{timeline.line}</Text>
					<Text dimColor>
						{' '}
						{box.single.teeUp} {belowCount} more below
					</Text>
				</Box>
			)}
		</Box>
	);
}

// Agent transfer line component
interface AgentTransferLineProps {
	event: TraceEvent;
	baseTimestamp: number;
	selected: boolean;
}

function AgentTransferLine({
	event,
	selected,
}: AgentTransferLineProps): React.ReactElement {
	const e = event as {from_agent?: string; to_agent?: string; reason?: string};

	return (
		<Box flexDirection="column" marginY={0}>
			<Box>
				<Text color={selected ? 'magentaBright' : 'magenta'}>
					{box.single.teeRight}
					{'─'}
					{'→'}{' '}
				</Text>
				<Text bold color={selected ? 'magentaBright' : 'magenta'}>
					agent.transfer
				</Text>
			</Box>
			<Box marginLeft={2}>
				<Text dimColor>"</Text>
				<Text color={selected ? 'white' : undefined}>{e.from_agent}</Text>
				<Text color="magenta"> → </Text>
				<Text color={selected ? 'white' : undefined}>{e.to_agent}</Text>
				<Text dimColor>"</Text>
			</Box>
			{e.reason && (
				<Box marginLeft={2}>
					<Text dimColor italic>
						{e.reason}
					</Text>
				</Box>
			)}
		</Box>
	);
}

export default EventListGrouped;
