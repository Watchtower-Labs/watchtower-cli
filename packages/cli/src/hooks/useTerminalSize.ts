/**
 * Hook for detecting terminal size with resize support
 */

import {useState, useEffect} from 'react';
import {useStdout} from 'ink';

export interface TerminalSize {
	columns: number;
	rows: number;
	isNarrow: boolean; // < 80 columns
	isMedium: boolean; // 80-120 columns
	isWide: boolean; // > 120 columns
}

function calculateSize(stdout: NodeJS.WriteStream | undefined): TerminalSize {
	const columns = stdout?.columns ?? 80;
	const rows = stdout?.rows ?? 24;

	return {
		columns,
		rows,
		isNarrow: columns < 80,
		isMedium: columns >= 80 && columns <= 120,
		isWide: columns > 120,
	};
}

export function useTerminalSize(): TerminalSize {
	const {stdout} = useStdout();
	const [size, setSize] = useState<TerminalSize>(() => calculateSize(stdout));

	useEffect(() => {
		if (!stdout) return;

		// Update size on resize
		const handleResize = () => {
			setSize(calculateSize(stdout));
		};

		// Listen for resize events
		stdout.on('resize', handleResize);

		// Initial size update (in case it changed since initial render)
		handleResize();

		// Cleanup
		return () => {
			stdout.off('resize', handleResize);
		};
	}, [stdout]);

	return size;
}

export default useTerminalSize;
