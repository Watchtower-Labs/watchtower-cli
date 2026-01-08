/**
 * ErrorDisplay component for rendering structured errors
 *
 * Provides a consistent, user-friendly error display with:
 * - Error codes for reference
 * - Clear error titles and messages
 * - Actionable troubleshooting hints
 */

import React from 'react';
import {Box, Text} from 'ink';
import {parseError, type WatchtowerCliError} from '../lib/errors.js';

export interface ErrorDisplayProps {
	/** Error message string or Error object */
	error: string | Error | WatchtowerCliError;
	/** Whether to show detailed information */
	verbose?: boolean;
}

/**
 * Check if value is a WatchtowerCliError
 */
function isWatchtowerCliError(value: unknown): value is WatchtowerCliError {
	return (
		typeof value === 'object' &&
		value !== null &&
		'code' in value &&
		'title' in value &&
		'message' in value
	);
}

export function ErrorDisplay({
	error,
	verbose = false,
}: ErrorDisplayProps): React.ReactElement {
	// Parse the error if it's a string or Error
	const parsedError: WatchtowerCliError = isWatchtowerCliError(error)
		? error
		: parseError(error);

	return (
		<Box
			borderStyle="round"
			borderColor="red"
			paddingX={1}
			paddingY={0}
			flexDirection="column"
		>
			{/* Error header with code */}
			<Box marginBottom={0}>
				<Text color="red" bold>
					Error [{parsedError.code}]
				</Text>
				<Text color="red"> {parsedError.title}</Text>
			</Box>

			{/* Error message */}
			<Box marginTop={0}>
				<Text color="white">{parsedError.message}</Text>
			</Box>

			{/* Troubleshooting hints */}
			{parsedError.hints && parsedError.hints.length > 0 && (
				<Box marginTop={1} flexDirection="column">
					<Text dimColor>Possible solutions:</Text>
					{parsedError.hints.map((hint, i) => (
						<Box key={i} marginLeft={1}>
							<Text dimColor>• {hint}</Text>
						</Box>
					))}
				</Box>
			)}

			{/* Verbose details */}
			{verbose && parsedError.details && (
				<Box marginTop={1} flexDirection="column">
					<Text dimColor>Details:</Text>
					<Box marginLeft={1}>
						<Text color="gray">{parsedError.details}</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
}

export default ErrorDisplay;
