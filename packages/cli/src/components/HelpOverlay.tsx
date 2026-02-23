/**
 * HelpOverlay component showing keyboard shortcuts
 *
 * Design: Modal overlay with grouped keyboard shortcuts
 */

import React from 'react';
import {Box, Text} from 'ink';
import {colors} from '../lib/theme.js';

export interface KeyBinding {
	key: string;
	description: string;
}

export interface KeyGroup {
	title: string;
	bindings: KeyBinding[];
}

export interface HelpOverlayProps {
	context?: 'show' | 'list' | 'tail';
}

// Common keyboard shortcuts
const navigationKeys: KeyBinding[] = [
	{key: '↑/k', description: 'Move up'},
	{key: '↓/j', description: 'Move down'},
	{key: 'u', description: 'Page up'},
	{key: 'd', description: 'Page down'},
	{key: 'g', description: 'Go to start'},
	{key: 'G', description: 'Go to end'},
];

const actionKeys: KeyBinding[] = [
	{key: 'Enter', description: 'View details / Open'},
	{key: 'b/Esc', description: 'Go back'},
	{key: '?', description: 'Toggle help'},
	{key: 'q', description: 'Quit'},
];

const showKeys: KeyBinding[] = [
	{key: '/', description: 'Search events'},
	{key: 'c', description: 'Clear search'},
	{key: 'e', description: 'Export trace'},
	{key: 'a', description: 'Toggle agent view'},
	{key: 't', description: 'Toggle tools view'},
	{key: 'm', description: 'Toggle models view'},
	{key: 'n', description: 'Next agent'},
	{key: 'N', description: 'Previous agent'},
	{key: '1-9', description: 'Jump to agent #'},
];

const tailKeys: KeyBinding[] = [
	{key: 'p', description: 'Pause/Resume'},
	{key: 'Ctrl+C', description: 'Stop process'},
];

const listKeys: KeyBinding[] = [
	{key: 'Enter', description: 'Open selected trace'},
];

function getKeyGroups(context?: string): KeyGroup[] {
	const groups: KeyGroup[] = [
		{title: 'Navigation', bindings: navigationKeys},
		{title: 'Actions', bindings: actionKeys},
	];

	if (context === 'show') {
		groups.push({title: 'Show View', bindings: showKeys});
	} else if (context === 'tail') {
		groups.push({title: 'Live Tail', bindings: tailKeys});
	} else if (context === 'list') {
		groups.push({title: 'List View', bindings: listKeys});
	}

	return groups;
}

export function HelpOverlay({context}: HelpOverlayProps): React.ReactElement {
	const groups = getKeyGroups(context);

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={colors.brand.primary}
			paddingX={2}
			paddingY={1}
		>
			{/* Header */}
			<Box justifyContent="space-between" marginBottom={1}>
				<Text bold color={colors.brand.primary}>
					Keyboard Shortcuts
				</Text>
				<Text dimColor>Press ? or Esc to close</Text>
			</Box>

			{/* Key groups */}
			<Box flexDirection="row" gap={4}>
				{groups.map(group => (
					<Box key={group.title} flexDirection="column" minWidth={24}>
						<Text bold color="cyan" underline>
							{group.title}
						</Text>
						{group.bindings.map(binding => (
							<Box key={binding.key} marginTop={0}>
								<Text bold color="white">
									{binding.key.padEnd(8)}
								</Text>
								<Text dimColor>{binding.description}</Text>
							</Box>
						))}
					</Box>
				))}
			</Box>

			{/* Footer */}
			<Box
				marginTop={1}
				borderStyle="single"
				borderTop
				borderBottom={false}
				borderLeft={false}
				borderRight={false}
				borderColor="gray"
				paddingTop={1}
			>
				<Text dimColor>
					Tip: Use vim-style keys (j/k) or arrow keys for navigation
				</Text>
			</Box>
		</Box>
	);
}

export default HelpOverlay;
