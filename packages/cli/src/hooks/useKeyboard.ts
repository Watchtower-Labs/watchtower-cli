/**
 * Keyboard input hook wrapping Ink's useInput
 */

import {useInput, useApp} from 'ink';
import type {KeyboardHandlers} from '../lib/types.js';

export function useKeyboard(handlers: KeyboardHandlers): void {
	const {exit} = useApp();

	useInput((input, key) => {
		// Quit handlers
		if (input === 'q' || (key.ctrl && input === 'c')) {
			handlers.onQuit?.();
			exit();
			return;
		}

		// Navigation - Arrow keys
		if (key.upArrow) {
			handlers.onUp?.();
			return;
		}

		if (key.downArrow) {
			handlers.onDown?.();
			return;
		}

		// Navigation - Vim keys
		if (input === 'k') {
			handlers.onUp?.();
			return;
		}

		if (input === 'j') {
			handlers.onDown?.();
			return;
		}

		// Enter/Select
		if (key.return) {
			handlers.onEnter?.();
			return;
		}

		// Back/Escape
		if (key.escape) {
			handlers.onEscape?.();
			handlers.onBack?.();
			return;
		}

		if (input === 'b') {
			handlers.onBack?.();
			return;
		}

		// Pause (for live view)
		if (input === 'p') {
			handlers.onPause?.();
			return;
		}

		// Page navigation
		if (key.pageUp || input === 'u') {
			handlers.onPageUp?.();
			return;
		}

		if (key.pageDown || input === 'd') {
			handlers.onPageDown?.();
			return;
		}

		// Home/End
		if (input === 'g') {
			handlers.onHome?.();
			return;
		}

		if (input === 'G') {
			handlers.onEnd?.();
			return;
		}
	});
}

export default useKeyboard;
