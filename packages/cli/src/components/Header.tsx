/**
 * Header component showing branding, run info and status
 *
 * Design: Double-line border with brand colors and status badges
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {ProcessStatus} from '../lib/types.js';
import {formatTimestamp, badges, colors} from '../lib/theme.js';

export interface HeaderProps {
	runId: string;
	timestamp?: number;
	agentName?: string;
	live?: boolean;
	status?: ProcessStatus;
	paused?: boolean;
}

// ASCII art branding (compact)
const BRAND = '⚡ WATCHTOWER';

export function Header({
	runId,
	timestamp,
	agentName,
	live = false,
	status,
	paused = false,
}: HeaderProps): React.ReactElement {
	const timeStr = timestamp ? formatTimestamp(timestamp, 'absolute') : '';

	// Determine status badge
	const getStatusBadge = () => {
		if (paused) return badges.paused;
		if (status === 'error') return badges.error;
		if (live) return badges.live;
		if (status === 'stopped') return badges.stopped;
		if (status === 'running') return badges.live;
		return null;
	};

	const statusBadge = getStatusBadge();

	// Get status color
	const getStatusColor = () => {
		if (paused) return 'yellow';
		if (status === 'error') return 'red';
		if (live || status === 'running') return 'green';
		return 'gray';
	};

	return (
		<Box
			borderStyle="round"
			borderColor={colors.brand.primary}
			paddingX={1}
			flexDirection="column"
		>
			{/* Top row: Brand + Status */}
			<Box justifyContent="space-between">
				<Text bold color={colors.brand.primary}>
					{BRAND}
				</Text>
				{statusBadge && (
					<Text bold color={getStatusColor()}>
						{statusBadge}
					</Text>
				)}
			</Box>

			{/* Bottom row: Run details */}
			<Box marginTop={0}>
				<Text dimColor>Run: </Text>
				<Text bold color="white">
					{runId || 'unknown'}
				</Text>

				{agentName && (
					<>
						<Text dimColor> │ Agent: </Text>
						<Text color="white">{agentName}</Text>
					</>
				)}

				{timeStr && (
					<>
						<Text dimColor> │ </Text>
						<Text dimColor>{timeStr}</Text>
					</>
				)}
			</Box>
		</Box>
	);
}

export default Header;
