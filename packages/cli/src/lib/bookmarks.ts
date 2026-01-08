/**
 * Bookmark management for Watchtower traces
 *
 * Allows users to mark important traces for quick access.
 * Bookmarks are stored in ~/.watchtower/bookmarks.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

const BOOKMARKS_DIR = '.watchtower';
const BOOKMARKS_FILE = 'bookmarks.json';

export interface Bookmark {
	runId: string;
	label?: string;
	createdAt: string;
}

interface BookmarksData {
	version: string;
	bookmarks: Bookmark[];
}

/**
 * Get the bookmarks file path
 */
function getBookmarksPath(): string {
	return path.join(os.homedir(), BOOKMARKS_DIR, BOOKMARKS_FILE);
}

/**
 * Ensure the bookmarks directory exists
 */
function ensureBookmarksDir(): void {
	const dir = path.join(os.homedir(), BOOKMARKS_DIR);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, {recursive: true, mode: 0o700});
	}
}

/**
 * Load bookmarks from file
 */
export function loadBookmarks(): Bookmark[] {
	const bookmarksPath = getBookmarksPath();

	if (!fs.existsSync(bookmarksPath)) {
		return [];
	}

	try {
		const content = fs.readFileSync(bookmarksPath, 'utf-8');
		const data = JSON.parse(content) as BookmarksData;
		return data.bookmarks ?? [];
	} catch {
		return [];
	}
}

/**
 * Save bookmarks to file
 */
function saveBookmarks(bookmarks: Bookmark[]): void {
	ensureBookmarksDir();
	const bookmarksPath = getBookmarksPath();

	const data: BookmarksData = {
		version: '1.0',
		bookmarks,
	};

	fs.writeFileSync(bookmarksPath, JSON.stringify(data, null, 2), {
		mode: 0o600,
	});
}

/**
 * Check if a trace is bookmarked
 */
export function isBookmarked(runId: string): boolean {
	const bookmarks = loadBookmarks();
	return bookmarks.some(b => b.runId === runId);
}

/**
 * Add a bookmark for a trace
 */
export function addBookmark(runId: string, label?: string): boolean {
	const bookmarks = loadBookmarks();

	// Check if already bookmarked
	if (bookmarks.some(b => b.runId === runId)) {
		return false;
	}

	bookmarks.push({
		runId,
		label,
		createdAt: new Date().toISOString(),
	});

	saveBookmarks(bookmarks);
	return true;
}

/**
 * Remove a bookmark
 */
export function removeBookmark(runId: string): boolean {
	const bookmarks = loadBookmarks();
	const index = bookmarks.findIndex(b => b.runId === runId);

	if (index === -1) {
		return false;
	}

	bookmarks.splice(index, 1);
	saveBookmarks(bookmarks);
	return true;
}

/**
 * Toggle a bookmark (add if not exists, remove if exists)
 */
export function toggleBookmark(runId: string, label?: string): boolean {
	if (isBookmarked(runId)) {
		removeBookmark(runId);
		return false; // Returns false when removed
	} else {
		addBookmark(runId, label);
		return true; // Returns true when added
	}
}

/**
 * Update a bookmark's label
 */
export function updateBookmarkLabel(runId: string, label: string): boolean {
	const bookmarks = loadBookmarks();
	const bookmark = bookmarks.find(b => b.runId === runId);

	if (!bookmark) {
		return false;
	}

	bookmark.label = label;
	saveBookmarks(bookmarks);
	return true;
}

/**
 * Get all bookmarked run IDs as a Set for efficient lookup
 */
export function getBookmarkedIds(): Set<string> {
	const bookmarks = loadBookmarks();
	return new Set(bookmarks.map(b => b.runId));
}

/**
 * Get bookmark info for a run ID
 */
export function getBookmark(runId: string): Bookmark | null {
	const bookmarks = loadBookmarks();
	return bookmarks.find(b => b.runId === runId) ?? null;
}
