import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
    normalizeExcludePatterns,
    buildExcludeGlob,
    isPathExcluded
} from '../../utils/exclude-patterns';

test('normalizeExcludePatterns trims entries and drops empty ones', () => {
    assert.deepEqual(normalizeExcludePatterns([' vendor ', '', '  ', 'dist']), ['vendor', 'dist']);
});

test('buildExcludeGlob normalizes a single simple directory name', () => {
    assert.equal(buildExcludeGlob(['vendor']), '**/vendor/**');
});

test('buildExcludeGlob normalizes multiple simple directory names into a brace glob', () => {
    assert.equal(buildExcludeGlob(['vendor', 'dist']), '{**/vendor/**,**/dist/**}');
});

test('buildExcludeGlob keeps full glob patterns verbatim', () => {
    assert.equal(
        buildExcludeGlob(['**/vendor/**', 'src/legacy/**', '**/*.test.ts']),
        '{**/vendor/**,src/legacy/**,**/*.test.ts}'
    );
});

test('buildExcludeGlob mixes simple names and full globs', () => {
    assert.equal(buildExcludeGlob(['vendor', 'src/legacy/**']), '{**/vendor/**,src/legacy/**}');
});

test('buildExcludeGlob ignores negated patterns and returns single positive without braces', () => {
    assert.equal(buildExcludeGlob(['**/vendor/**', '!**/vendor/keep/**']), '**/vendor/**');
});

test('buildExcludeGlob returns empty string when only negated patterns are present', () => {
    assert.equal(buildExcludeGlob(['!**/vendor/**']), '');
    assert.equal(buildExcludeGlob([]), '');
    assert.equal(buildExcludeGlob(['', '   ']), '');
});

test('isPathExcluded excludes a simple directory name at any depth', () => {
    assert.equal(isPathExcluded('vendor/a.js', ['vendor']), true);
    assert.equal(isPathExcluded('src/vendor/a.js', ['vendor']), true);
    assert.equal(isPathExcluded('src/app.ts', ['vendor']), false);
});

test('isPathExcluded supports the full glob **/vendor/**', () => {
    assert.equal(isPathExcluded('vendor/a.js', ['**/vendor/**']), true);
    assert.equal(isPathExcluded('src/vendor/a.js', ['**/vendor/**']), true);
    assert.equal(isPathExcluded('src/app.ts', ['**/vendor/**']), false);
});

test('isPathExcluded re-includes paths matched by a negated pattern', () => {
    const patterns = ['**/vendor/**', '!**/vendor/keep/**'];
    assert.equal(isPathExcluded('vendor/drop.js', patterns), true);
    assert.equal(isPathExcluded('vendor/keep/a.js', patterns), false);
});

test('isPathExcluded matches file globs such as **/*.test.ts', () => {
    assert.equal(isPathExcluded('src/foo.test.ts', ['**/*.test.ts']), true);
    assert.equal(isPathExcluded('src/foo.ts', ['**/*.test.ts']), false);
});

test('isPathExcluded normalizes Windows backslash paths', () => {
    assert.equal(isPathExcluded('src\\vendor\\a.js', ['vendor']), true);
    assert.equal(isPathExcluded('vendor\\a.js', ['**/vendor/**']), true);
});

test('isPathExcluded applies patterns in order and the last match wins', () => {
    const patterns = ['!**/vendor/**', '**/vendor/skip/**'];
    assert.equal(isPathExcluded('vendor/skip/a.js', patterns), true);
    assert.equal(isPathExcluded('vendor/other/a.js', patterns), false);
});

test('isPathExcluded returns false when there are no patterns', () => {
    assert.equal(isPathExcluded('src/app.ts', []), false);
    assert.equal(isPathExcluded('src/app.ts', ['', '  ']), false);
});

test('isPathExcluded matches default-style hidden directories like .git', () => {
    assert.equal(isPathExcluded('.git/config', ['.git']), true);
    assert.equal(isPathExcluded('src/.next/build.js', ['.next']), true);
});
