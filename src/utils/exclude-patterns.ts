// Pure, testable helpers for the comment-scan exclusion patterns.
// These functions intentionally avoid importing `vscode` so they can run in
// plain Node tests. Matching follows .gitignore semantics: patterns are
// evaluated in order and the last match wins; a leading `!` re-includes.
//
// minimatch@3.1.2 ships no TypeScript declarations (and this project has no
// `@types/minimatch`), so the module is resolved via `require()`. Note that in
// v3 `module.exports` IS the minimatch function itself (there is no
// `.minimatch` property), so a named import would resolve to `undefined`.

const minimatch = require('minimatch') as (target: string, pattern: string, options?: { dot?: boolean }) => boolean;

function isSimpleName(pattern: string): boolean {
    return !pattern.includes('*') && !pattern.includes('/') && !pattern.includes('\\');
}

function normalizeSeparators(pattern: string): string {
    return pattern.replace(/\\/g, '/');
}

// Turns a single exclusion entry into a matchable glob. Plain directory names
// are anchored at any depth (`vendor` -> `**/vendor/**`) to preserve the
// previous behavior. Patterns that already contain glob magic or a path
// separator are used verbatim.
function toGlobPattern(pattern: string): string {
    const normalized = normalizeSeparators(pattern);
    if (isSimpleName(normalized)) {
        return `**/${normalized}/**`;
    }
    return normalized;
}

export function normalizeExcludePatterns(patterns: string[]): string[] {
    return patterns
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0);
}

// Builds a single glob suitable for `vscode.workspace.findFiles(include, exclude)`.
// Negated (`!`) patterns are dropped because findFiles does not support them;
// they still apply to per-document scanning via `isPathExcluded`. Returns ''
// when there is nothing safe to exclude.
export function buildExcludeGlob(patterns: string[]): string {
    const normalized = normalizeExcludePatterns(patterns);
    const positives = normalized.filter((pattern) => !pattern.startsWith('!'));

    if (positives.length === 0) {
        return '';
    }

    const globs = positives
        .map(toGlobPattern)
        // Brace expansion splits on commas, so a pattern that itself contains a
        // brace or comma would produce an invalid exclude glob for findFiles.
        // Such patterns are still honored by `isPathExcluded`.
        .filter((glob) => !glob.includes(',') && !glob.includes('{') && !glob.includes('}'));

    if (globs.length === 0) {
        return '';
    }

    if (globs.length === 1) {
        return globs[0];
    }

    return `{${globs.join(',')}}`;
}

function normalizePath(relativePath: string): string {
    return normalizeSeparators(relativePath).replace(/^\.\//, '');
}

// gitignore-style exclusion check. The initial state is "not excluded";
// patterns are applied in order and the last one that matches wins.
// A negation (`!`) re-includes a path that a previous pattern excluded.
export function isPathExcluded(relativePath: string, patterns: string[]): boolean {
    const normalizedPath = normalizePath(relativePath);
    let excluded = false;

    for (const rawPattern of normalizeExcludePatterns(patterns)) {
        let globPattern = rawPattern;
        let negated = false;

        if (globPattern.startsWith('!')) {
            negated = true;
            globPattern = globPattern.slice(1).trim();
        }

        if (!globPattern) {
            continue;
        }

        // dot: true keeps wildcards matching dot-directories such as `.git`.
        if (minimatch(normalizedPath, toGlobPattern(globPattern), { dot: true })) {
            excluded = !negated;
        }
    }

    return excluded;
}
