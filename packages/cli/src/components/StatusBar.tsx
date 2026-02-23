/**
 * StatusBar component showing keyboard shortcuts
 *
 * Design: Visual key badges with descriptions
 */

import React from 'react';
import {Box, Text} from 'ink';
import {colors} from '../lib/theme.js';

export interface KeyBinding {
	key: string;
	description: string;
}

export interface StatusBarProps {
	keys: string[] | KeyBinding[];
}

// Parse a key string like "Enter: Expand" into KeyBinding
function parseKeyString(keyStr: string): KeyBinding {
	const parts = keyStr.split(/:\s*/);
	if (parts.length >= 2) {
		return {
			key: parts[0] ?? '',
			description: parts.slice(1).join(': '),
		};
	}
	return {key: keyStr, description: ''};
}

// Render a single key badge
function KeyBadge({binding}: {binding: KeyBinding}): React.ReactElement {
	return (
		<Box marginRight={2}>
			<Text bold color="cyan">
				{binding.key}
			</Text>
			{binding.description && <Text dimColor>: {binding.description}</Text>}
		</Box>
	);
}

export function StatusBar({keys}: StatusBarProps): React.ReactElement {
	// Normalize keys to KeyBinding format
	const bindings: KeyBinding[] = keys.map(k =>
		typeof k === 'string' ? parseKeyString(k) : k,
	);

	return (
		<Box
			borderStyle="round"
			borderColor={colors.border.muted}
			paddingX={1}
			justifyContent="flex-start"
		>
			{bindings.map((binding, index) => (
				<KeyBadge key={index} binding={binding} />
			))}
		</Box>
	);
}

export default StatusBar;
