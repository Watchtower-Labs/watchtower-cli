/**
 * Summary component for displaying trace statistics
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {TraceSummary, LiveStats} from '../lib/types.js';
import {formatDuration, formatTokens} from '../lib/theme.js';

export interface SummaryProps {
	summary?: TraceSummary;
	liveStats?: LiveStats;
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
		<Box borderStyle="single" borderColor="gray" paddingX={1} gap={3}>
			<Text>
				Duration: <Text bold>{formatDuration(duration)}</Text>
			</Text>
			<Text>
				LLM Calls: <Text bold>{llmCalls}</Text>
			</Text>
			<Text>
				Tool Calls: <Text bold>{toolCalls}</Text>
			</Text>
			<Text>
				Tokens: <Text bold>{formatTokens(tokens)}</Text>
			</Text>
			{errors > 0 && (
				<Text color="red">
					Errors: <Text bold>{errors}</Text>
				</Text>
			)}
		</Box>
	);
}

export default Summary;
