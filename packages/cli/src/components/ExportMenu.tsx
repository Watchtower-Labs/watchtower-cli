/**
 * ExportMenu component for selecting export format
 *
 * Design: Simple menu overlay with format options
 */

import React from 'react';
import {Box, Text} from 'ink';
import {colors} from '../lib/theme.js';
import type {ExportFormat} from '../lib/export.js';

export interface ExportMenuProps {
	onSelect: (format: ExportFormat) => void;
	onClose: () => void;
	exporting?: boolean;
	result?: {
		success: boolean;
		path?: string;
		error?: string;
	};
}

interface MenuOption {
	key: string;
	format: ExportFormat;
	label: string;
	description: string;
}

const options: MenuOption[] = [
	{
		key: '1',
		format: 'json',
		label: 'JSON',
		description: 'Full trace with all events and metadata',
	},
	{
		key: '2',
		format: 'csv',
		label: 'CSV',
		description: 'Tabular format for spreadsheet analysis',
	},
	{
		key: '3',
		format: 'markdown',
		label: 'Markdown',
		description: 'Human-readable report',
	},
];

export function ExportMenu({
	exporting,
	result,
}: ExportMenuProps): React.ReactElement {
	// Show result if available
	if (result) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={result.success ? 'green' : 'red'}
				paddingX={2}
				paddingY={1}
			>
				{result.success ? (
					<>
						<Text bold color="green">
							Export Successful
						</Text>
						<Box marginTop={1}>
							<Text dimColor>Saved to: </Text>
							<Text color="cyan">{result.path}</Text>
						</Box>
					</>
				) : (
					<>
						<Text bold color="red">
							Export Failed
						</Text>
						<Box marginTop={1}>
							<Text color="red">{result.error}</Text>
						</Box>
					</>
				)}
				<Box marginTop={1}>
					<Text dimColor>Press any key to close</Text>
				</Box>
			</Box>
		);
	}

	// Show exporting state
	if (exporting) {
		return (
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={colors.brand.primary}
				paddingX={2}
				paddingY={1}
			>
				<Text bold color={colors.brand.primary}>
					Exporting...
				</Text>
			</Box>
		);
	}

	// Show menu
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor={colors.brand.primary}
			paddingX={2}
			paddingY={1}
		>
			<Box justifyContent="space-between" marginBottom={1}>
				<Text bold color={colors.brand.primary}>
					Export Trace
				</Text>
				<Text dimColor>Esc: cancel</Text>
			</Box>

			{options.map(option => (
				<Box key={option.key} marginTop={0}>
					<Text bold color="cyan">
						{option.key})
					</Text>
					<Text> </Text>
					<Text bold color="white">
						{option.label}
					</Text>
					<Text dimColor> - {option.description}</Text>
				</Box>
			))}

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
				<Text dimColor>Files are saved to current directory</Text>
			</Box>
		</Box>
	);
}

/**
 * Handle export menu key input
 */
export function handleExportKey(
	key: string,
	onSelect: (format: ExportFormat) => void,
): boolean {
	const option = options.find(o => o.key === key);
	if (option) {
		onSelect(option.format);
		return true;
	}
	return false;
}

export default ExportMenu;
