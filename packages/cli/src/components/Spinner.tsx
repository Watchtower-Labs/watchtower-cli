/**
 * Spinner component for animated loading indicators
 *
 * Design: Multiple spinner styles for different contexts
 */

import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import {spinnerFrames, dotsFrames} from '../lib/theme.js';

export type SpinnerType = 'dots' | 'spinner' | 'pulse';

export interface SpinnerProps {
	type?: SpinnerType;
	color?: string;
	label?: string;
	interval?: number;
}

const pulseFrames = ['◐', '◓', '◑', '◒'];

function getFrames(type: SpinnerType): string[] {
	switch (type) {
		case 'dots':
			return dotsFrames;
		case 'pulse':
			return pulseFrames;
		case 'spinner':
		default:
			return spinnerFrames;
	}
}

export function Spinner({
	type = 'spinner',
	color = 'cyan',
	label,
	interval = 80,
}: SpinnerProps): React.ReactElement {
	const [frameIndex, setFrameIndex] = useState(0);
	const frames = getFrames(type);

	useEffect(() => {
		const timer = setInterval(() => {
			setFrameIndex(prev => (prev + 1) % frames.length);
		}, interval);

		return () => clearInterval(timer);
	}, [frames.length, interval]);

	const frame = frames[frameIndex] ?? frames[0];

	return (
		<Text>
			<Text color={color}>{frame}</Text>
			{label && <Text> {label}</Text>}
		</Text>
	);
}

export default Spinner;
