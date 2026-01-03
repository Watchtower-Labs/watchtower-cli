/**
 * Header component showing run info and status
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {ProcessStatus} from '../lib/types.js';
import {formatTimestamp, statusColors} from '../lib/theme.js';

export interface HeaderProps {
	runId: string;
	timestamp?: number;
	agentName?: string;
	live?: boolean;
	status?: ProcessStatus;
	paused?: boolean;
}

export function Header({
	runId,
	timestamp,
	agentName,
	live = false,
	status,
	paused = false,
}: HeaderProps): React.ReactElement {
	const timeStr = timestamp ? formatTimestamp(timestamp, 'absolute') : '';

	return (
		<Box
			borderStyle="single"
			borderColor="gray"
			paddingX={1}
			justifyContent="space-between"
		>
			<Box>
				<Text bold color="magenta">
					watchtower
				</Text>
				<Text color="gray"> {'\u2022'} </Text>
				<Text>
					Run: <Text bold>{runId || 'unknown'}</Text>
				</Text>
				{agentName && (
					<>
						<Text color="gray"> {'\u2022'} </Text>
						<Text>{agentName}</Text>
					</>
				)}
				{timeStr && (
					<>
						<Text color="gray"> {'\u2022'} </Text>
						<Text dimColor>{timeStr}</Text>
					</>
				)}
			</Box>

			<Box>
				{live && (
					<Box marginRight={1}>
						{paused ? (
							<Text color="yellow">PAUSED</Text>
						) : (
							<Text color="green">LIVE</Text>
						)}
					</Box>
				)}
				{status && (
					<Text color={statusColors[status]}>
						{status === 'running' && '\u25CF '}
						{status === 'starting' && '\u25CB '}
						{status === 'stopped' && '\u25A0 '}
						{status === 'error' && '\u2717 '}
						{status.toUpperCase()}
					</Text>
				)}
			</Box>
		</Box>
	);
}

export default Header;
