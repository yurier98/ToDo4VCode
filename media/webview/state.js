const vscode = acquireVsCodeApi();
let currentTasks = [];

// Restore state from VS Code state
const previousState = vscode.getState();
const KNOWN_CODE_FILE_TAGS = new Set(['Dockerfile', 'Makefile', 'Procfile']);
const VALID_VIEW_MODES = new Set(['list', 'kanban', 'calendar']);
const VALID_GROUP_MODES = new Set(['status', 'priority', 'none']);
const VALID_SORT_MODES = new Set(['priority', 'dueDate', 'title', 'custom']);

function pad2(value) {
    return String(value).padStart(2, '0');
}

function toMonthCursor(date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${pad2(month)}`;
}

function normalizeCalendarCursor(value) {
    if (typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
        return value;
    }
    return toMonthCursor(new Date());
}

function cursorToMonthStart(cursor) {
    const normalized = normalizeCalendarCursor(cursor);
    const [yearValue, monthValue] = normalized.split('-');
    const year = Number.parseInt(yearValue, 10);
    const month = Number.parseInt(monthValue, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    }
    return new Date(year, month - 1, 1);
}

function toDayKey(date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function dayKeyToTimestamp(dayKey) {
    if (typeof dayKey !== 'string') return null;
    const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number.parseInt(match[1], 10);
    const month = Number.parseInt(match[2], 10);
    const day = Number.parseInt(match[3], 10);
    const date = new Date(year, month - 1, day);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date.getTime();
}

function getTaskDueTimestamp(task) {
    const dueDate = task?.dueDate;
    if (dueDate === null || dueDate === undefined) return null;
    const numericValue = typeof dueDate === 'number' ? dueDate : Number(dueDate);
    if (!Number.isFinite(numericValue)) return null;
    return numericValue;
}

function getTaskDueDayKey(task) {
    const dueTimestamp = getTaskDueTimestamp(task);
    if (dueTimestamp === null) return null;
    const date = new Date(dueTimestamp);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return toDayKey(date);
}

function normalizeViewMode(mode) {
    const normalized = typeof mode === 'string' ? mode.trim() : '';
    return VALID_VIEW_MODES.has(normalized) ? normalized : 'list';
}

function normalizeGroupBy(mode) {
    const normalized = typeof mode === 'string' ? mode.trim() : '';
    return VALID_GROUP_MODES.has(normalized) ? normalized : 'status';
}

function normalizeSortBy(mode) {
    if (typeof mode !== 'string') return 'priority';
    const normalized = mode.trim();
    if (normalized === 'date') return 'dueDate';
    if (normalized === 'status') return 'priority';
    return VALID_SORT_MODES.has(normalized) ? normalized : 'priority';
}

let viewMode = normalizeViewMode(previousState?.viewMode);
let groupBy = normalizeGroupBy(previousState?.groupBy);
let hideCompleted = previousState?.hideCompleted || false;
let sortBy = normalizeSortBy(previousState?.sortBy);
let searchQuery = typeof previousState?.searchQuery === 'string' ? previousState.searchQuery : '';
let activeTagFilters = normalizeTags(previousState?.activeTagFilters || []).filter((tag) => isTagFilterCandidate(tag));
let calendarCursor = normalizeCalendarCursor(previousState?.calendarCursor);
let selectedDayKey = typeof previousState?.selectedDayKey === 'string' ? previousState.selectedDayKey : null;

let hideCompletedSubtasksState = previousState?.hideCompletedSubtasksState || false;

let activeTaskId = null;
let editingTaskId = null;
let modalTaskId = null;
let pendingTaskModalId = null;
let collapsedSections = new Set(Array.isArray(previousState?.collapsedSections) ? previousState.collapsedSections : []);
let shouldAutoEditNewTask = false;

// Initialize UI from previous state
window.addEventListener('DOMContentLoaded', () => {
    updateViewModeUI();
    updateGroupByUI();
});

const SORT_PRIORITY = ['Must', 'Should', 'Could', "Wont"];
const VALID_PRIORITIES = new Set(['Must', 'Should', 'Could', 'Wont']);

function normalizePriority(priority) {
    if (priority === "Won't") return 'Wont';
    return VALID_PRIORITIES.has(priority) ? priority : 'Should';
}

function normalizeTags(tags) {
    if (!Array.isArray(tags)) return [];

    const seen = new Set();
    const normalized = [];

    for (const tag of tags) {
        if (typeof tag !== 'string') continue;
        const cleaned = tag.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
        if (!cleaned) continue;
        const dedupeKey = cleaned.toLowerCase();
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        normalized.push(cleaned);
    }

    return normalized;
}

function parseTagsInput(rawInput) {
    if (typeof rawInput !== 'string') return [];
    return normalizeTags(rawInput.split(','));
}

function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function asTaskArray(value) {
    return Array.isArray(value) ? value : [];
}

function asText(value) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
}

function getTaskSubtasks(task) {
    return Array.isArray(task?.subtasks) ? task.subtasks : [];
}

function getTaskReminders(task) {
    return Array.isArray(task?.reminders) ? task.reminders : [];
}

function getTaskTags(task) {
    return normalizeTags(Array.isArray(task?.tags) ? task.tags : []);
}

function splitTagsByType(tags) {
    const normalized = normalizeTags(tags);
    const categoryTags = [];
    const codeReferenceTags = [];

    for (const tag of normalized) {
        if (parseCodeReferenceTag(tag)) {
            codeReferenceTags.push(tag);
        } else {
            categoryTags.push(tag);
        }
    }

    return { categoryTags, codeReferenceTags };
}

function parseCodeReferenceTag(tag) {
    if (typeof tag !== 'string') return null;
    let raw = tag.trim();
    if (!raw) return null;

    if (
        (raw.startsWith('`') && raw.endsWith('`')) ||
        (raw.startsWith('"') && raw.endsWith('"')) ||
        (raw.startsWith('\'') && raw.endsWith('\''))
    ) {
        raw = raw.slice(1, -1).trim();
    }

    if (!raw) return null;

    let targetPath = raw;
    let line = null;
    let column = null;
    let endLine = null;
    let endColumn = null;
    const rangeMatch = raw.match(/:(\d+)(?::(\d+))?-(\d+)(?::(\d+))?$/);

    if (rangeMatch && typeof rangeMatch.index === 'number') {
        const candidatePath = raw.slice(0, rangeMatch.index);
        if (candidatePath && !candidatePath.endsWith(':')) {
            targetPath = candidatePath;
            line = Number.parseInt(rangeMatch[1], 10);
            if (rangeMatch[2]) {
                column = Number.parseInt(rangeMatch[2], 10);
            }
            endLine = Number.parseInt(rangeMatch[3], 10);
            if (rangeMatch[4]) {
                endColumn = Number.parseInt(rangeMatch[4], 10);
            }
        }
    } else {
        const locationMatch = raw.match(/:(\d+)(?::(\d+))?$/);
        if (locationMatch && typeof locationMatch.index === 'number') {
            const candidatePath = raw.slice(0, locationMatch.index);
            if (candidatePath && !candidatePath.endsWith(':')) {
                targetPath = candidatePath;
                line = Number.parseInt(locationMatch[1], 10);
                if (locationMatch[2]) {
                    column = Number.parseInt(locationMatch[2], 10);
                }
            }
        }
    }

    if (line && endLine && endLine < line) {
        const tmpLine = line;
        const tmpColumn = column;
        line = endLine;
        column = endColumn;
        endLine = tmpLine;
        endColumn = tmpColumn;
    }

    const isFolderHint = /[\\/]$/.test(targetPath);
    targetPath = targetPath.replace(/[\\/]+$/, '').replace(/^\.\//, '').trim();
    if (!targetPath) return null;

    const hasPathSeparator = /[\\/]/.test(targetPath);
    const hasFileExtension = /\.[A-Za-z0-9_-]{1,16}$/.test(targetPath);
    const isAbsolute = targetPath.startsWith('/') || /^[A-Za-z]:[\\/]/.test(targetPath);
    const fileName = targetPath.split(/[\\/]/).pop() || '';
    if (!hasPathSeparator && !hasFileExtension && !isAbsolute && !KNOWN_CODE_FILE_TAGS.has(fileName)) {
        return null;
    }

    return { raw, path: targetPath, line, column, endLine, endColumn, isFolderHint };
}

function getCodeReferenceDisplayLabel(tag) {
    const parsed = parseCodeReferenceTag(tag);
    if (!parsed) return typeof tag === 'string' ? tag : '';

    const normalizedPath = parsed.path.replace(/\\/g, '/');
    const segments = normalizedPath.split('/').filter(Boolean);
    let label = segments[segments.length - 1] || normalizedPath;

    if (parsed.isFolderHint && label && !label.endsWith('/')) {
        label = `${label}/`;
    }

    if (parsed.line && parsed.line > 0) {
        label += `:${parsed.line}`;
        if (parsed.column && parsed.column > 0) {
            label += `:${parsed.column}`;
        }

        if (parsed.endLine && parsed.endLine > 0) {
            label += `-${parsed.endLine}`;
            if (parsed.endColumn && parsed.endColumn > 0) {
                label += `:${parsed.endColumn}`;
            }
        }
    }

    return label;
}

function openCodeTagFromBadge(e, encodedTag) {
    if (e) e.stopPropagation();
    let decodedTag = '';
    try {
        decodedTag = decodeURIComponent(encodedTag || '');
    } catch {
        decodedTag = encodedTag || '';
    }

    const parsed = parseCodeReferenceTag(decodedTag);
    if (!parsed) return;
    vscode.postMessage({ type: 'openCodeLink', value: parsed.raw });
}

function isTagFilterCandidate(tag) {
    if (typeof tag !== 'string') return false;
    const normalized = normalizeTags([tag])[0];
    if (!normalized) return false;
    return !parseCodeReferenceTag(normalized);
}

function getSettingsState() {
    return {
        viewMode,
        groupBy,
        hideCompleted,
        hideCompletedSubtasksState,
        sortBy,
        collapsedSections: Array.from(collapsedSections),
        searchQuery,
        activeTagFilters
    };
}

function getLocalState() {
    return {
        ...getSettingsState(),
        calendarCursor,
        selectedDayKey
    };
}

function persistLocalState() {
    vscode.setState(getLocalState());
}

// Save state to VS Code
function saveState() {
    const settingsState = getSettingsState();
    vscode.setState({
        ...settingsState,
        calendarCursor,
        selectedDayKey
    });
    vscode.postMessage({ 
        type: 'updateSettings', 
        settings: settingsState,
        viewType: window.viewType || 'sidebar'
    });
}

// Modal States
let modalStatus = 'Todo';
let modalPriority = 'Wont';
let modalTags = [];
let modalDueDate = null;
let modalReminders = [];

// Premium States
let currentPremiumStatus = 'Todo';
let configuredDefaultPriority = 'Should';
let currentPremiumPriority = configuredDefaultPriority;
let currentPremiumTags = [];
let currentPremiumReminders = [];
let currentPremiumDate = null;

const PRIORITY_COLORS = {
    'Must': '#FF3B30',
    'Should': '#FF9500',
    'Could': '#007AFF',
    'Wont': '#8E8E93'
};

const STATUS_ICONS = {
    'Todo': 'codicon-layers anim-slow-float',
    'Ready': 'codicon-layers-active anim-pulse',
    'In Progress': 'codicon-loading codicon-modifier-spin',
    'Testing': 'codicon-beaker anim-float',
    'Done': 'codicon-pass anim-slow-pulse'
};

// --- Modal Management ---
