import test from 'ava';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {StreamingTraceParser} from '../lib/streaming-parser.js';
import {RateLimiter} from '../lib/rate-limiter.js';

async function createLargeTraceFile(eventCount: number): Promise<string> {
	const filePath = path.join(
		os.tmpdir(),
		`watchtower-stress-${Date.now()}-${Math.random()
			.toString(36)
			.slice(2)}.jsonl`,
	);

	const stream = fs.createWriteStream(filePath, {encoding: 'utf-8'});
	for (let index = 0; index < eventCount; index++) {
		const event = {
			type: 'llm.request',
			run_id: 'stress-run',
			timestamp: 1_700_000_000 + index,
			request_id: `req-${index}`,
			model: 'stress-model',
			message_count: 1,
			tools_available: ['search'],
		};

		const line = `${JSON.stringify(event)}\n`;
		if (!stream.write(line)) {
			await new Promise<void>(resolve => {
				stream.once('drain', () => {
					resolve();
				});
			});
		}
	}

	await new Promise<void>((resolve, reject) => {
		stream.end(() => {
			resolve();
		});
		stream.once('error', error => {
			reject(error);
		});
	});

	return filePath;
}

function cleanup(filePath: string): void {
	try {
		fs.unlinkSync(filePath);
	} catch {}
}

const stressEnabled = process.env['WATCHTOWER_STRESS'] === '1';
const runStressTest = stressEnabled ? test : test.skip;

runStressTest(
	'[stress] streaming parser handles 50k events with bounded page memory',
	async t => {
		const eventCount = 50_000;
		const pageSize = 200;
		const filePath = await createLargeTraceFile(eventCount);
		const parser = new StreamingTraceParser(filePath, {pageSize});

		try {
			const beforeHeap = process.memoryUsage().heapUsed;

			const firstPage = await parser.getPage(0);
			t.is(firstPage.events.length, pageSize);
			t.is(firstPage.totalEvents, eventCount);
			t.is(firstPage.totalPages, eventCount / pageSize);

			const lastPage = await parser.getPage(firstPage.totalPages - 1);
			t.is(lastPage.events.length, pageSize);
			t.is(lastPage.hasNext, false);

			const afterHeap = process.memoryUsage().heapUsed;
			const heapDeltaMb = (afterHeap - beforeHeap) / (1024 * 1024);

			// Conservative threshold to avoid flaky failures across CI runners.
			t.true(heapDeltaMb < 200);
		} finally {
			parser.cancel();
			cleanup(filePath);
		}
	},
);

runStressTest(
	'[stress] rate limiter caps throughput under burst load',
	async t => {
		const limiter = new RateLimiter({
			maxEventsPerSecond: 200,
			burstSize: 50,
		});

		for (let index = 0; index < 10_000; index++) {
			limiter.check();
		}

		const afterBurst = limiter.getStats();
		t.true(afterBurst.totalProcessed <= 100);
		t.true(afterBurst.totalThrottled > 9_000);

		await new Promise<void>(resolve => {
			setTimeout(resolve, 250);
		});

		const processedBeforeRecovery = limiter.getStats().totalProcessed;
		for (let index = 0; index < 200; index++) {
			limiter.check();
		}

		const processedAfterRecovery = limiter.getStats().totalProcessed;
		const processedDuringRecovery =
			processedAfterRecovery - processedBeforeRecovery;

		// 200 events/s over 250ms refills ~50 tokens; allow broad jitter in CI.
		t.true(processedDuringRecovery >= 30);
		t.true(processedDuringRecovery <= 100);
	},
);
