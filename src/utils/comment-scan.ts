export interface CommentMarkerHit {
    line: number;        // 1-based
    marker: 'TODO' | 'FIXME' | 'NOTE';
    text: string;        // raw text after the marker, unnormalized
}

type LexState = 'code' | 'singleString' | 'doubleString' | 'templateLiteral' | 'blockComment' | 'tripleSingleString' | 'tripleDoubleString';

const COMMENT_MARKER_REGEX = /^\s*(TODO|FIXME|NOTE)\b(?:\s*[:\-]\s*|\s+)?(.*)$/i;

export function findCommentMarkers(content: string): CommentMarkerHit[] {
    const hits: CommentMarkerHit[] = [];
    let line = 1;
    let state: LexState = 'code';
    let i = 0;
    const length = content.length;

    while (i < length) {
        const char = content[i];

        switch (state) {
            case 'code': {
                if (char === '\n') {
                    line += 1;
                    i += 1;
                    continue;
                }

                if (char === "'") {
                    if (content[i + 1] === "'" && content[i + 2] === "'") {
                        state = 'tripleSingleString';
                        i += 3;
                    } else {
                        state = 'singleString';
                        i += 1;
                    }
                    continue;
                }

                if (char === '"') {
                    if (content[i + 1] === '"' && content[i + 2] === '"') {
                        state = 'tripleDoubleString';
                        i += 3;
                    } else {
                        state = 'doubleString';
                        i += 1;
                    }
                    continue;
                }

                if (char === '`') {
                    state = 'templateLiteral';
                    i += 1;
                    continue;
                }

                if (char === '/' && content[i + 1] === '*') {
                    state = 'blockComment';
                    i += 2;
                    continue;
                }

                if (char === '/' && content[i + 1] === '/') {
                    const commentStart = i + 2;
                    let end = commentStart;
                    while (end < length && content[end] !== '\n' && content[end] !== '\r') {
                        end += 1;
                    }

                    const commentText = content.slice(commentStart, end);
                    const match = commentText.match(COMMENT_MARKER_REGEX);
                    if (match) {
                        hits.push({
                            line,
                            marker: match[1].toUpperCase() as 'TODO' | 'FIXME' | 'NOTE',
                            text: match[2]
                        });
                    }

                    i = end;
                    continue;
                }

                if (char === '#') {
                    const commentStart = i + 1;
                    let end = commentStart;
                    while (end < length && content[end] !== '\n' && content[end] !== '\r') {
                        end += 1;
                    }

                    const commentText = content.slice(commentStart, end);
                    const match = commentText.match(COMMENT_MARKER_REGEX);
                    if (match) {
                        hits.push({
                            line,
                            marker: match[1].toUpperCase() as 'TODO' | 'FIXME' | 'NOTE',
                            text: match[2]
                        });
                    }

                    i = end;
                    continue;
                }

                i += 1;
                continue;
            }

            case 'singleString': {
                if (char === '\\') {
                    i += 2;
                    continue;
                }
                if (char === "'") {
                    state = 'code';
                    i += 1;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }

            case 'doubleString': {
                if (char === '\\') {
                    i += 2;
                    continue;
                }
                if (char === '"') {
                    state = 'code';
                    i += 1;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }

            case 'tripleSingleString': {
                if (char === '\\') {
                    i += 2;
                    continue;
                }
                if (char === "'" && content[i + 1] === "'" && content[i + 2] === "'") {
                    state = 'code';
                    i += 3;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }

            case 'tripleDoubleString': {
                if (char === '\\') {
                    i += 2;
                    continue;
                }
                if (char === '"' && content[i + 1] === '"' && content[i + 2] === '"') {
                    state = 'code';
                    i += 3;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }

            case 'templateLiteral': {
                if (char === '\\') {
                    i += 2;
                    continue;
                }
                if (char === '`') {
                    state = 'code';
                    i += 1;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }

            case 'blockComment': {
                if (char === '*' && content[i + 1] === '/') {
                    state = 'code';
                    i += 2;
                    continue;
                }
                if (char === '\n') {
                    line += 1;
                }
                i += 1;
                continue;
            }
        }
    }

    return hits;
}
