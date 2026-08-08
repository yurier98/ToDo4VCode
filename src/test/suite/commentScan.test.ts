import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { findCommentMarkers } from '../../utils/comment-scan';

test('findCommentMarkers detects // TODO: fix this on line 1', () => {
    const hits = findCommentMarkers('// TODO: fix this');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'fix this');
});

test('findCommentMarkers ignores markers inside string literals', () => {
    const hits = findCommentMarkers('const s = "// TODO: not a comment"; // TODO: real one');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'real one');
});

test('findCommentMarkers ignores markers inside a single-line template literal', () => {
    const hits = findCommentMarkers('const t = `// FIXME inside template`;');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores markers inside a multiline template literal', () => {
    const hits = findCommentMarkers('const x = `line1\n// NOTE inside\n`;');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores markers inside block comments', () => {
    const hits = findCommentMarkers('/* TODO: inside block */');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers captures FIXME with dash separator', () => {
    const hits = findCommentMarkers('// FIXME - broken');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].marker, 'FIXME');
    assert.equal(hits[0].text, 'broken');
});

test('findCommentMarkers detects trailing comment on a code line', () => {
    const hits = findCommentMarkers('x = 1; // NOTE: remember');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1);
    assert.equal(hits[0].marker, 'NOTE');
    assert.equal(hits[0].text, 'remember');
});

test('findCommentMarkers reports correct 1-based lines across multiple lines', () => {
    const hits = findCommentMarkers('line1\n// TODO: a\nline3\n// FIXME: b');
    assert.equal(hits.length, 2);
    assert.equal(hits[0].line, 2);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'a');
    assert.equal(hits[1].line, 4);
    assert.equal(hits[1].marker, 'FIXME');
    assert.equal(hits[1].text, 'b');
});

test('findCommentMarkers ignores markers behind escaped quotes', () => {
    const hits = findCommentMarkers('const s = "don\'t // TODO: not real";');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers is case-insensitive on the marker', () => {
    const hits = findCommentMarkers('// todo: lower');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'lower');
});

test('findCommentMarkers returns empty array for empty or marker-less content', () => {
    assert.deepEqual(findCommentMarkers(''), []);
    assert.deepEqual(findCommentMarkers('plain code line\nno markers here'), []);
});

test('findCommentMarkers ignores markers after an escaped double quote', () => {
    const hits = findCommentMarkers('"a \\" // TODO fake"');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores markers inside the Auto-import description string', () => {
    const hits = findCommentMarkers('const desc = "Auto-import // TODO, // FIXME and // NOTE comments as tasks"');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers detects # TODO: fix this on line 1', () => {
    const hits = findCommentMarkers('# TODO: fix this');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'fix this');
});

test('findCommentMarkers detects trailing # comment on a code line', () => {
    const hits = findCommentMarkers('x = 1  # FIXME: broken');
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 1);
    assert.equal(hits[0].marker, 'FIXME');
    assert.equal(hits[0].text, 'broken');
});

test('findCommentMarkers ignores # markers inside a double-quoted string', () => {
    const hits = findCommentMarkers('s = "# TODO not a comment"');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores markers inside a single-quoted triple docstring', () => {
    const hits = findCommentMarkers("x = '''\n# TODO inside\n'''");
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores markers inside a multiline double-quoted triple docstring', () => {
    const hits = findCommentMarkers('x = """\nline1\n# NOTE inside\n"""');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers detects a real # comment after a closed docstring', () => {
    const hits = findCommentMarkers("'''doc'''\n# TODO: real after");
    assert.equal(hits.length, 1);
    assert.equal(hits[0].line, 2);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'real after');
});

test('findCommentMarkers does not close a triple string on a single quote', () => {
    const hits = findCommentMarkers("x = '''don't close\n# TODO fake\n'''");
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores # markers inside an f-string', () => {
    const hits = findCommentMarkers('f"value {x} # TODO fake"');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers ignores # markers inside a URL string', () => {
    const hits = findCommentMarkers('url = "https://x.dev/#anchor"');
    assert.equal(hits.length, 0);
});

test('findCommentMarkers mixes JS // and Python # comments in one file', () => {
    const hits = findCommentMarkers('// TODO: js\n# TODO: py');
    assert.equal(hits.length, 2);
    assert.equal(hits[0].line, 1);
    assert.equal(hits[0].marker, 'TODO');
    assert.equal(hits[0].text, 'js');
    assert.equal(hits[1].line, 2);
    assert.equal(hits[1].marker, 'TODO');
    assert.equal(hits[1].text, 'py');
});
