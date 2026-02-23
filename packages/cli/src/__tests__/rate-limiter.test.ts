import test from 'ava';
import {RateLimiter, createRateLimiter} from '../lib/rate-limiter.js';

test('RateLimiter allows events within rate limit', t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 100,
	});

	const result = limiter.check();

	t.is(result.shouldProcess, true);
	t.is(result.isThrottled, false);
	t.is(result.waitTime, 0);
});

test('RateLimiter throttles events above rate limit', t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 2,
	});

	// Process burst size events
	let i = 0;
	for (; i < 2; i++) {
		const result = limiter.check();
		t.is(result.shouldProcess, true);
		t.is(result.isThrottled, false);
	}

	// Next event should be throttled
	const result = limiter.check();
	t.is(result.shouldProcess, false);
	t.is(result.isThrottled, true);
	t.true(result.waitTime > 0);
});

test('RateLimiter calls throttling change callback', t => {
	const throttlingStates: boolean[] = [];
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 2,
		onThrottlingChange: isThrottling => {
			throttlingStates.push(isThrottling);
		},
	});

	// Process burst size events
	limiter.check();
	limiter.check();

	// Next event triggers throttling
	limiter.check();

	t.deepEqual(throttlingStates, [true]);
});

test('RateLimiter recovers after time passes', async t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 1000, // Very high rate for testing
		burstSize: 1,
	});

	// Consume burst capacity
	let result = limiter.check();
	t.is(result.shouldProcess, true);
	t.is(result.isThrottled, false);

	// Next event should be throttled
	result = limiter.check();
	t.is(result.shouldProcess, false);
	t.is(result.isThrottled, true);

	// Wait for token refill
	await new Promise(resolve => setTimeout(resolve, 100));

	// Should be able to process again
	result = limiter.check();
	t.is(result.shouldProcess, true);
	t.is(result.isThrottled, false);
});

test('RateLimiter returns correct statistics', t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 5,
	});

	// Process some events
	limiter.check();
	limiter.check();
	limiter.check();

	// Try to process more than burst size
	limiter.check();
	limiter.check();
	limiter.check(); // This should be throttled

	const stats = limiter.getStats();

	t.is(stats.totalProcessed, 5);
	t.is(stats.totalThrottled, 1);
	t.true(stats.currentTokens >= 0);
	t.is(stats.maxTokens, 5);
});

test('RateLimiter resets correctly', t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 2,
	});

	// Consume burst capacity
	limiter.check();
	limiter.check();

	// Check stats before reset
	let stats = limiter.getStats();
	t.is(stats.totalProcessed, 2);
	t.is(stats.totalThrottled, 0);

	// Reset
	limiter.reset();

	// Check stats after reset
	stats = limiter.getStats();
	t.is(stats.totalProcessed, 0);
	t.is(stats.totalThrottled, 0);
	t.is(stats.currentTokens, 2);
});

test('RateLimiter can change max events per second', async t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 2,
	});

	// Consume burst capacity
	limiter.check();
	limiter.check();

	// Event should be throttled
	let result = limiter.check();
	t.is(result.shouldProcess, false);

	// Increase rate
	limiter.setMaxEventsPerSecond(1000);

	// Wait for tokens to refill
	await new Promise(resolve => setTimeout(resolve, 10));

	// Should now be able to process
	result = limiter.check();
	t.is(result.shouldProcess, true);
});

test('RateLimiter forceProcess bypasses rate limit', t => {
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 2,
	});

	// Consume one token from burst
	let result = limiter.check();
	t.is(result.shouldProcess, true);

	// Next event should succeed (burst has 1 more token)
	result = limiter.check();
	t.is(result.shouldProcess, true);

	// Consume remaining token - should be throttled
	result = limiter.check();
	t.is(result.shouldProcess, false);

	// Force process bypasses rate limit and doesn't consume token
	limiter.forceProcess({});

	// Force process increments processed count but not throttled
	const stats = limiter.getStats();
	t.is(stats.totalProcessed, 3); // 2 checks + 1 force process
	t.is(stats.totalThrottled, 1);
});

test('createRateLimiter creates RateLimiter instance', t => {
	const limiter = createRateLimiter({
		maxEventsPerSecond: 100,
	});

	t.is(limiter instanceof RateLimiter, true);
});

test('RateLimiter uses default options', t => {
	const limiter = new RateLimiter();

	const stats = limiter.getStats();
	t.is(stats.maxTokens, 10); // Default burst size
});

test('RateLimiter throttling state is accurate', async t => {
	const throttlingStates: boolean[] = [];
	const limiter = new RateLimiter({
		maxEventsPerSecond: 10,
		burstSize: 1,
		onThrottlingChange: isThrottling => {
			throttlingStates.push(isThrottling);
		},
	});

	// Process event (not throttling)
	limiter.check();
	t.is(throttlingStates.length, 0);

	// Try to process more (throttling)
	limiter.check();
	t.is(throttlingStates.length, 1);
	t.is(throttlingStates[0], true);

	// Wait for token refill
	await new Promise(resolve => setTimeout(resolve, 200));

	// Process event (not throttling anymore)
	limiter.check();
	t.is(throttlingStates.length, 2);
	t.is(throttlingStates[1], false);
});
