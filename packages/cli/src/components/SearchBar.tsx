/**
 * SearchBar component for filtering events
 *
 * Design: Inline search input with filter syntax support
 * Syntax: type:llm, agent:name, tool:name, or plain text search
 */

import React from 'react';
import {Box, Text, useInput} from 'ink';
import {colors} from '../lib/theme.js';

export interface SearchBarProps {
	query: string;
	onChange: (query: string) => void;
	resultCount: number;
	totalCount: number;
	onClose: () => void;
	isActive?: boolean;
}

export function SearchBar({
	query,
	onChange,
	resultCount,
	totalCount,
	onClose,
	isActive = true,
}: SearchBarProps): React.ReactElement {
	// Handle keyboard input when search is active
	useInput(
		(input, key) => {
			if (!isActive) return;

			// Escape closes the search
			if (key.escape) {
				onClose();
				return;
			}

			// Enter confirms and closes
			if (key.return) {
				onClose();
				return;
			}

			// Backspace/Delete removes last character
			if (key.backspace || key.delete) {
				onChange(query.slice(0, -1));
				return;
			}

			// Add printable characters to query
			if (input && !key.ctrl && !key.meta) {
				onChange(query + input);
			}
		},
		{isActive},
	);

	return (
		<Box
			borderStyle="round"
			borderColor={colors.brand.primary}
			paddingX={1}
			marginBottom={0}
		>
			<Text color={colors.brand.primary} bold>
				/
			</Text>
			<Text> </Text>
			<Text>{query}</Text>
			<Text color="cyan">_</Text>
			<Box flexGrow={1} />
			<Text dimColor>
				{resultCount}/{totalCount} matches
			</Text>
			<Text dimColor> | </Text>
			<Text dimColor>Esc: close</Text>
		</Box>
	);
}

// Filter hint component shown when search is closed
export function SearchHint(): React.ReactElement {
	return (
		<Box paddingX={1}>
			<Text dimColor>Press </Text>
			<Text color="cyan">/</Text>
			<Text dimColor>
				{' '}
				to search (type:llm, agent:name, tool:name, or text)
			</Text>
		</Box>
	);
}

export default SearchBar;
