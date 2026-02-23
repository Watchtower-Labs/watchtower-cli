import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import test from 'ava';
import {
	toggleBookmark,
	isBookmarked,
	addBookmark,
	removeBookmark,
	loadBookmarks,
} from '../lib/bookmarks.js';

// Point WATCHTOWER_HOME at a temp directory so tests never touch ~/.watchtower
const tmpHome = fs.mkdtempSync(
	path.join(os.tmpdir(), `wt-bm-${Date.now()}-${Math.floor(Math.random() * 1e9)}-`),
);
process.env['WATCHTOWER_HOME'] = tmpHome;

test.after.always(() => {
	// Clean up temp home directory
	fs.rmSync(tmpHome, {recursive: true, force: true});
	delete process.env['WATCHTOWER_HOME'];
});

test('isBookmarked returns false for unknown run ID', t => {
	const runId = `test-nonexistent-${Date.now()}-${Math.random()}`;
	t.false(isBookmarked(runId));
});

test('addBookmark adds a bookmark and isBookmarked returns true', t => {
	const runId = `test-add-${Date.now()}-${Math.random()}`;
	t.false(isBookmarked(runId));

	const added = addBookmark(runId);
	t.true(added);
	t.true(isBookmarked(runId));

	// Cleanup
	removeBookmark(runId);
});

test('addBookmark returns false if already bookmarked', t => {
	const runId = `test-dup-${Date.now()}-${Math.random()}`;
	addBookmark(runId);

	const addedAgain = addBookmark(runId);
	t.false(addedAgain);

	// Cleanup
	removeBookmark(runId);
});

test('removeBookmark removes an existing bookmark', t => {
	const runId = `test-remove-${Date.now()}-${Math.random()}`;
	addBookmark(runId);
	t.true(isBookmarked(runId));

	const removed = removeBookmark(runId);
	t.true(removed);
	t.false(isBookmarked(runId));
});

test('removeBookmark returns false for non-existent bookmark', t => {
	const runId = `test-noexist-remove-${Date.now()}-${Math.random()}`;
	const removed = removeBookmark(runId);
	t.false(removed);
});

test('toggleBookmark adds bookmark when not present', t => {
	const runId = `test-toggle-add-${Date.now()}-${Math.random()}`;
	t.false(isBookmarked(runId));

	const result = toggleBookmark(runId);
	t.true(result); // Returns true = now bookmarked
	t.true(isBookmarked(runId));

	// Cleanup
	toggleBookmark(runId);
});

test('toggleBookmark removes bookmark when already present', t => {
	const runId = `test-toggle-remove-${Date.now()}-${Math.random()}`;
	addBookmark(runId);
	t.true(isBookmarked(runId));

	const result = toggleBookmark(runId);
	t.false(result); // Returns false = removed
	t.false(isBookmarked(runId));
});

test('loadBookmarks returns an array', t => {
	const bookmarks = loadBookmarks();
	t.true(Array.isArray(bookmarks));
});

test('loadBookmarks includes recently added bookmark', t => {
	const runId = `test-load-${Date.now()}-${Math.random()}`;
	addBookmark(runId, 'test label');

	const bookmarks = loadBookmarks();
	const found = bookmarks.find(b => b.runId === runId);
	t.truthy(found);
	t.is(found!.label, 'test label');

	// Cleanup
	removeBookmark(runId);
});
