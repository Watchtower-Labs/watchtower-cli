/**
 * StatusBar component showing keyboard shortcuts
 */

import React from 'react';
import {Box, Text} from 'ink';

export interface StatusBarProps {
	keys: string[];
}

export function StatusBar({keys}: StatusBarProps): React.ReactElement {
	return (
		<Box
			borderStyle="single"
			borderColor="gray"
			paddingX={1}
			justifyContent="flex-start"
			gap={2}
		>
			{keys.map((key, index) => (
				<Text key={index} dimColor>
					{key}
				</Text>
			))}
		</Box>
	);
}

export default StatusBar;
