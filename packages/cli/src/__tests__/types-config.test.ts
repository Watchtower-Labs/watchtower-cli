import test from 'ava';
import {defaultConfig} from '../lib/types.js';

test('defaultConfig includes live rate limiting defaults', t => {
	t.is(defaultConfig.liveMaxEventsPerSecond, 120);
	t.is(defaultConfig.liveBurstSize, 30);
});

test('defaultConfig includes streaming show page size', t => {
	t.is(defaultConfig.showPageSize, 200);
});
