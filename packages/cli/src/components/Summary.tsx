/**
 * Summary component for displaying trace statistics
 *
 * Design: Horizontal stat cards with icons and visual separators
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {TraceSummary, LiveStats} from '../lib/types.js';
import {formatDuration, formatTokens, statIcons, colors} from '../lib/theme.js';

export interface SummaryProps {
	summary?: TraceSummary;
	liveStats?: LiveStats;
}

interface StatItemProps {
	icon: string;
	label: string;
	value: string | number;
	color?: string;
	isLast?: boolean;
}

function StatItem({
	icon,
	label,
	value,
	color = 'white',
	isLast = false,
}: StatItemProps): React.ReactElement {
	return (
		<Box>
			<Text dimColor>{icon} </Text>
			<Text dimColor>{label}: </Text>
			<Text bold color={color}>
				{value}
			</Text>
			{!isLast && <Text dimColor> │ </Text>}
		</Box>
	);
}

export function Summary({
	summary,
	liveStats,
}: SummaryProps): React.ReactElement {
	// Use live stats if provided, otherwise use summary
	const duration = liveStats?.duration ?? summary?.duration ?? 0;
	const llmCalls = liveStats?.llmCalls ?? summary?.llmCalls ?? 0;
	const toolCalls = liveStats?.toolCalls ?? summary?.toolCalls ?? 0;
	const tokens = liveStats?.tokens ?? summary?.totalTokens ?? 0;
	const errors = liveStats?.errors ?? summary?.errors ?? 0;

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.secondary}
			paddingX={1}
			justifyContent="flex-start"
		>
			<StatItem
				icon={statIcons.duration}
				label="Duration"
				value={formatDuration(duration)}
				color="cyan"
			/>
			<StatItem
				icon={statIcons.llm}
				label="LLM"
				value={llmCalls}
				color="magenta"
			/>
			<StatItem
				icon={statIcons.tools}
				label="Tools"
				value={toolCalls}
				color="yellow"
			/>
			<StatItem
				icon={statIcons.tokens}
				label="Tokens"
				value={formatTokens(tokens)}
				color="cyan"
			/>
			{errors > 0 ? (
				<StatItem
					icon={statIcons.errors}
					label="Errors"
					value={errors}
					color="red"
					isLast
				/>
			) : (
				<Box>
					<Text dimColor>{statIcons.success} </Text>
					<Text color="green">OK</Text>
				</Box>
			)}
		</Box>
	);
}

export default Summary;
