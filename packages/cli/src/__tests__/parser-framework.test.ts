import test from 'ava';
import {detectFramework} from '../lib/parser.js';

test('detectFramework prefers explicit framework field', t => {
	const framework = detectFramework({
		type: 'llm.response',
		run_id: 'abc123',
		timestamp: 1,
		framework: 'openai',
	});

	t.is(framework, 'openai');
});

test('detectFramework infers anthropic from stop_reason', t => {
	const framework = detectFramework({
		type: 'llm.response',
		run_id: 'abc123',
		timestamp: 1,
		stop_reason: 'end_turn',
	});

	t.is(framework, 'anthropic');
});

test('detectFramework infers openai from finish_reason without stop_reason', t => {
	const framework = detectFramework({
		type: 'llm.response',
		run_id: 'abc123',
		timestamp: 1,
		finish_reason: 'stop',
	});

	t.is(framework, 'openai');
});

test('detectFramework falls back to google_adk', t => {
	const framework = detectFramework({
		type: 'run.start',
		run_id: 'abc123',
		timestamp: 1,
	});

	t.is(framework, 'google_adk');
});
