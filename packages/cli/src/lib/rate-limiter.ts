/**
 * Rate limiter for controlling event throughput
 *
 * Limits the rate of event processing to prevent UI overload and
 * provides visibility into throttling state.
 */

import type {RateLimiterOptions, RateLimiterResult} from './types.js';

/**
 * Rate limiter for controlling event throughput.
 *
 * Uses a token bucket algorithm to limit the rate of events while
 * allowing for burst capacity.
 *
 * @example
 * ```ts
 * const limiter = new RateLimiter({
 *   maxEventsPerSecond: 100,
 *   onThrottlingChange: (isThrottling) => {
 *     if (isThrottling) {
 *       console.log('Events are being throttled');
 *     }
 *   }
 * });
 *
 * for (const event of events) {
 *   const result = limiter.check(event);
 *   if (result.shouldProcess) {
 *     processEvent(event);
 *   }
 * }
 * ```
 */
export class RateLimiter {
	private maxEventsPerSecond: number;
	private burstSize: number;
	private onThrottlingChange?: (isThrottling: boolean) => void;

	private tokenCount: number;
	private lastRefillTime: number;
	private isThrottling: boolean;
	private totalProcessed: number;
	private totalThrottled: number;

	constructor(options: RateLimiterOptions = {}) {
		this.maxEventsPerSecond = options.maxEventsPerSecond ?? 100;
		this.burstSize = options.burstSize ?? 10;
		this.onThrottlingChange = options.onThrottlingChange;

		// Initialize token bucket
		this.tokenCount = this.burstSize;
		this.lastRefillTime = Date.now();
		this.isThrottling = false;

		// Statistics
		this.totalProcessed = 0;
		this.totalThrottled = 0;
	}

	/**
	 * Check if an event should be processed.
	 *
	 * @param _event - The event to check (not currently used but kept for API consistency)
	 * @returns Result indicating whether to process and throttling status
	 */
	check(_event?: unknown): RateLimiterResult {
		// Refill tokens based on time elapsed
		this._refillTokens();

		// Check if we have a token available
		if (this.tokenCount >= 1) {
			// Process the event
			this.tokenCount--;
			this.totalProcessed++;

			// Update throttling state
			this._updateThrottlingState(false);

			return {
				shouldProcess: true,
				isThrottled: false,
				waitTime: 0,
			};
		}

		// Event is throttled
		this.totalThrottled++;

		// Update throttling state
		this._updateThrottlingState(true);

		// Calculate wait time until next token
		const waitTime = this._calculateWaitTime();

		return {
			shouldProcess: false,
			isThrottled: true,
			waitTime,
		};
	}

	/**
	 * Force process an event regardless of rate limit.
	 *
	 * This is useful for critical events that must be processed.
	 * Using this too frequently will defeat the rate limiting.
	 *
	 * @param _event - The event to process (unused parameter kept for API)
	 */
	forceProcess(_event: unknown): void {
		this._refillTokens();

		// Process the event without consuming a token
		this.totalProcessed++;

		// Update throttling state
		this._updateThrottlingState(false);
	}

	/**
	 * Get current statistics.
	 */
	getStats() {
		return {
			totalProcessed: this.totalProcessed,
			totalThrottled: this.totalThrottled,
			currentTokens: this.tokenCount,
			maxTokens: this.burstSize,
			isThrottling: this.isThrottling,
		};
	}

	/**
	 * Reset the rate limiter.
	 *
	 * Clears all statistics and resets the token bucket.
	 */
	reset(): void {
		this.tokenCount = this.burstSize;
		this.lastRefillTime = Date.now();
		this.totalProcessed = 0;
		this.totalThrottled = 0;
		this.isThrottling = false;
	}

	/**
	 * Update the max events per second.
	 *
	 * @param maxEventsPerSecond - New maximum rate
	 */
	setMaxEventsPerSecond(maxEventsPerSecond: number): void {
		this.maxEventsPerSecond = maxEventsPerSecond;
	}

	/**
	 * Refill tokens based on time elapsed.
	 */
	private _refillTokens(): void {
		const now = Date.now();
		const elapsed = (now - this.lastRefillTime) / 1000; // Convert to seconds

		if (elapsed > 0) {
			// Calculate tokens to add based on elapsed time
			const tokensToAdd = elapsed * this.maxEventsPerSecond;

			// Add tokens up to burst capacity
			this.tokenCount = Math.min(this.burstSize, this.tokenCount + tokensToAdd);

			this.lastRefillTime = now;
		}
	}

	/**
	 * Calculate wait time until next token is available.
	 */
	private _calculateWaitTime(): number {
		if (this.tokenCount >= 1) {
			return 0;
		}

		// Time needed for 1 more token
		const timePerToken = 1000 / this.maxEventsPerSecond;
		const tokensNeeded = 1 - this.tokenCount;

		return Math.ceil(tokensNeeded * timePerToken);
	}

	/**
	 * Update throttling state and notify callback.
	 */
	private _updateThrottlingState(isNowThrottling: boolean): void {
		if (this.isThrottling !== isNowThrottling) {
			this.isThrottling = isNowThrottling;
			this.onThrottlingChange?.(isNowThrottling);
		}
	}
}

/**
 * Create a rate limiter instance.
 *
 * @param options - Rate limiter options
 * @returns Rate limiter instance
 */
export function createRateLimiter(options?: RateLimiterOptions): RateLimiter {
	return new RateLimiter(options);
}

export default RateLimiter;
