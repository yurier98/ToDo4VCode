import * as vscode from 'vscode';
import * as path from 'path';
import { StorageManager } from '../storage/StorageManager';
import { TodoItem, Priority, Status, ViewSettings, CommentMarker, CommentScanSource } from '../models';
import { ReminderService } from './ReminderService';
import { StatisticsService, TaskStatistics } from './StatisticsService';
import { Logger } from '../../utils/logger';

interface CommentScanEntry {
    sourceKey: string;
    source: CommentScanSource;
    text: string;
    description: string;
    tags: string[];
}

export class TaskService implements vscode.Disposable {
    private static readonly COMMENT_SCAN_INCLUDE_GLOB = '**/*';
    private static readonly COMMENT_SCAN_EXCLUDE_GLOB = '**/{node_modules,.git,.next,.nuxt,dist,build,out,coverage,.vscode-test}/**';
    private static readonly COMMENT_SCAN_MAX_FILES = 2000;
    private static readonly COMMENT_SCAN_MAX_FILE_SIZE_BYTES = 1024 * 1024;
    private static readonly COMMENT_MARKER_REGEX = /\/\/\s*(TODO|FIXME|NOTE)\b(?:\s*[:\-]\s*|\s+)?(.*)$/i;
    private static readonly COMMENT_SCAN_BINARY_EXTENSIONS = new Set([
        '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.ico', '.svg',
        '.mp3', '.wav', '.ogg', '.flac', '.mp4', '.m4v', '.mov', '.avi', '.mkv',
        '.zip', '.rar', '.7z', '.tar', '.gz', '.pdf', '.woff', '.woff2', '.ttf', '.eot',
        '.exe', '.dll', '.so', '.dylib', '.bin', '.class', '.jar', '.wasm', '.pyc'
    ]);

    private readonly _onTasksChanged = new vscode.EventEmitter<TodoItem[]>();
    public readonly onTasksChanged = this._onTasksChanged.event;

    private readonly _onSettingsChanged = new vscode.EventEmitter<{ viewType: 'sidebar' | 'full', settings: ViewSettings }>();
    public readonly onSettingsChanged = this._onSettingsChanged.event;

    private readonly _reminderService: ReminderService;
    private _commentScanQueue: Promise<void> = Promise.resolve();
    private _isCommentScanSuspended = false;

    constructor(private readonly _storageManager: StorageManager) {
        this._reminderService = new ReminderService(
            () => this.getTasks(),
            (tasks) => this._saveTasks(tasks)
        );
    }

    public get onReminder() {
        return this._reminderService.onReminder;
    }

    public dispose(): void {
        this._onTasksChanged.dispose();
        this._onSettingsChanged.dispose();
        this._reminderService.dispose();
    }

    public async getSettings(viewType: 'sidebar' | 'full'): Promise<ViewSettings | undefined> {
        return this._storageManager.getSettings(viewType);
    }

    public async saveSettings(viewType: 'sidebar' | 'full', settings: ViewSettings): Promise<void> {
        await this._storageManager.saveSettings(viewType, settings);
        this._onSettingsChanged.fire({ viewType, settings });
    }

    public async getTasks(): Promise<TodoItem[]> {
        try {
            const tasks = await this._storageManager.getTasks();
            let changed = false;
            tasks.forEach((t, i) => {
                if (t.order === undefined) {
                    t.order = (i + 1) * 1000;
                    changed = true;
                }
                const normalizedTags = TaskService._normalizeTags(t.tags);
                const currentTags = Array.isArray(t.tags) ? t.tags : undefined;
                if (JSON.stringify(normalizedTags) !== JSON.stringify(currentTags)) {
                    t.tags = normalizedTags;
                    changed = true;
                }
                const normalizedSource = TaskService._normalizeCommentSource(t.source);
                if (JSON.stringify(normalizedSource) !== JSON.stringify(t.source)) {
                    t.source = normalizedSource;
                    changed = true;
                }
            });
            if (changed) {
                await this._storageManager.saveTasks(tasks);
            }
            return tasks;
        } catch (error) {
            Logger.error('Error getting tasks', error);
            return [];
        }
    }

    public async getStatistics(): Promise<TaskStatistics> {
        const tasks = await this.getTasks();
        return StatisticsService.calculateStatistics(tasks);
    }

    public async importCommentTasksFromWorkspace(): Promise<void> {
        if (this._isCommentScanSuspended) {
            return;
        }

        return this._queueCommentScan(async () => {
            const files = await vscode.workspace.findFiles(
                TaskService.COMMENT_SCAN_INCLUDE_GLOB,
                TaskService.COMMENT_SCAN_EXCLUDE_GLOB,
                TaskService.COMMENT_SCAN_MAX_FILES
            );

            await this._importCommentTasks(files);
        });
    }

    public async importCommentTasksFromDocument(document: vscode.TextDocument): Promise<void> {
        if (this._isCommentScanSuspended) {
            return;
        }

        if (document.uri.scheme !== 'file') {
            return;
        }

        return this._queueCommentScan(async () => {
            await this._importCommentTasks([document.uri]);
        });
    }

    public async runWithCommentScanSuspended<T>(action: () => Promise<T>): Promise<T> {
        const previousState = this._isCommentScanSuspended;
        this._isCommentScanSuspended = true;

        try {
            return await action();
        } finally {
            this._isCommentScanSuspended = previousState;
        }
    }

    public async addTask(taskData: {
        text: string;
        priority: Priority;
        status?: Status;
        description?: string;
        tags?: string[];
        dueDate?: number;
        reminders?: number[];
    }): Promise<TodoItem[]> {
        try {
            const tasks = await this.getTasks();
            const newTask: TodoItem = {
                id: Math.random().toString(36).substring(2, 11),
                text: taskData.text,
                description: taskData.description,
                tags: TaskService._normalizeTags(taskData.tags),
                priority: taskData.priority,
                status: taskData.status || 'Todo',
                dueDate: taskData.dueDate,
                reminders: taskData.reminders,
                completed: taskData.status === 'Done',
                createdAt: Date.now(),
                order: tasks.length > 0 ? Math.max(...tasks.map(t => t.order || 0)) + 1000 : 1000
            };
            tasks.push(newTask);
            await this._saveAndNotify(tasks);
            return tasks;
        } catch (error) {
            Logger.error('Error adding task', error);
            throw error;
        }
    }

    public async updateOrder(id: string, newOrder: number): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.order = newOrder;
        });
    }

    public async updateOrders(orders: { id: string; order: number }[]): Promise<TodoItem[]> {
        try {
            const tasks = await this.getTasks();
            orders.forEach(o => {
                const task = tasks.find(t => t.id === o.id);
                if (task) {
                    task.order = o.order;
                }
            });
            await this._saveAndNotify(tasks);
            return tasks;
        } catch (error) {
            Logger.error('Error updating orders', error);
            throw error;
        }
    }

    public async updateStatus(id: string, status: Status): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.status = status;
            task.completed = status === 'Done';
        });
    }

    public async updatePriority(id: string, priority: Priority): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.priority = priority;
        });
    }

    public async updateTaskText(id: string, text: string): Promise<TodoItem[]> {
        if (!text || !text.trim()) {
            Logger.warn('Attempted to update task text with empty value', { id });
            throw new Error('Task text cannot be empty');
        }
        return this._updateTask(id, task => {
            task.text = text.trim();
        });
    }

    public async updateDescription(id: string, description: string): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.description = description;
        });
    }

    public async updateTags(id: string, tags: string[]): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.tags = TaskService._normalizeTags(tags);
        });
    }

    public async updateDueDate(id: string, dueDate: number | null): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.dueDate = dueDate || undefined;
        });
    }

    public async updateReminders(id: string, reminders: number[]): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.reminders = reminders;
        });
    }

    public async deleteTask(id: string): Promise<TodoItem[]> {
        try {
            let tasks = await this.getTasks();
            tasks = tasks.filter(t => t.id !== id);
            await this._saveAndNotify(tasks);
            return tasks;
        } catch (error) {
            Logger.error('Error deleting task', error);
            throw error;
        }
    }

    public async clearAllTasks(): Promise<void> {
        try {
            await this.saveTasks([]);
            Logger.info('All tasks cleared');
        } catch (error) {
            Logger.error('Error clearing all tasks', error);
            throw error;
        }
    }

    public async addSubtask(taskId: string, text: string): Promise<TodoItem[]> {
        return this._updateTask(taskId, task => {
            if (!task.subtasks) {
                task.subtasks = [];
            }
            task.subtasks.push({
                id: Math.random().toString(36).substring(2, 11),
                text,
                completed: false
            });
        });
    }

    public async toggleSubtask(taskId: string, subtaskId: string): Promise<TodoItem[]> {
        return this._updateTask(taskId, task => {
            const subtask = task.subtasks?.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.completed = !subtask.completed;
            }
        });
    }

    public async deleteSubtask(taskId: string, subtaskId: string): Promise<TodoItem[]> {
        return this._updateTask(taskId, task => {
            if (task.subtasks) {
                task.subtasks = task.subtasks.filter(s => s.id !== subtaskId);
            }
        });
    }

    public async updateSubtaskText(taskId: string, subtaskId: string, text: string): Promise<TodoItem[]> {
        return this._updateTask(taskId, task => {
            const subtask = task.subtasks?.find(s => s.id === subtaskId);
            if (subtask) {
                subtask.text = text;
            }
        });
    }

    private async _updateTask(id: string, updater: (task: TodoItem) => void): Promise<TodoItem[]> {
        try {
            const tasks = await this.getTasks();
            const task = tasks.find(t => t.id === id);
            if (task) {
                updater(task);
                await this._saveAndNotify(tasks);
            }
            return tasks;
        } catch (error) {
            Logger.error('Error updating task', error);
            throw error;
        }
    }

    public async saveTasks(tasks: TodoItem[]): Promise<void> {
        await this._saveTasks(tasks);
        this._onTasksChanged.fire(tasks);
        this._reminderService.scheduleNextReminder();
    }

    private async _saveTasks(tasks: TodoItem[]): Promise<void> {
        await this._storageManager.saveTasks(tasks);
    }

    private async _saveAndNotify(tasks: TodoItem[]): Promise<void> {
        await this._saveTasks(tasks);
        this._onTasksChanged.fire(tasks);
        this._reminderService.scheduleNextReminder();
    }

    private async _queueCommentScan(scanAction: () => Promise<void>): Promise<void> {
        const nextScan = this._commentScanQueue.then(scanAction).catch((error) => {
            Logger.error('Error while scanning workspace comments', error);
        });

        this._commentScanQueue = nextScan;
        await nextScan;
    }

    private async _importCommentTasks(uris: vscode.Uri[]): Promise<void> {
        if (uris.length === 0) {
            return;
        }

        const tasks = await this.getTasks();
        const commentTaskBySourceKey = new Map<string, TodoItem>();

        tasks.forEach((task) => {
            const source = TaskService._normalizeCommentSource(task.source);
            if (!source) {
                return;
            }

            const key = TaskService._buildCommentSourceKey(source.file, source.line, source.marker);
            commentTaskBySourceKey.set(key, task);
        });

        let hasChanges = false;
        let addedCount = 0;
        let updatedCount = 0;
        let nextOrder = tasks.reduce((max, task) => Math.max(max, task.order || 0), 0);

        for (const uri of uris) {
            try {
                if (TaskService._shouldSkipUriByExtension(uri)) {
                    continue;
                }

                const relativeFile = vscode.workspace.asRelativePath(uri, false);
                if (!relativeFile || relativeFile.startsWith('..')) {
                    continue;
                }

                const entries = await this._extractCommentScanEntries(uri, relativeFile);
                for (const entry of entries) {
                    const existingTask = commentTaskBySourceKey.get(entry.sourceKey);
                    if (existingTask) {
                        if (this._syncCommentTask(existingTask, entry)) {
                            updatedCount += 1;
                            hasChanges = true;
                        }
                        continue;
                    }

                    nextOrder += 1000;
                    const newTask: TodoItem = {
                        id: TaskService._createCommentTaskId(entry.sourceKey),
                        text: entry.text,
                        description: entry.description,
                        tags: TaskService._normalizeTags(entry.tags),
                        priority: TaskService._priorityFromMarker(entry.source.marker),
                        status: 'Todo',
                        completed: false,
                        createdAt: Date.now(),
                        order: nextOrder,
                        source: entry.source
                    };

                    tasks.push(newTask);
                    commentTaskBySourceKey.set(entry.sourceKey, newTask);
                    addedCount += 1;
                    hasChanges = true;
                }
            } catch (error) {
                Logger.error('Failed to scan file for comment tasks', error, uri.fsPath);
            }
        }

        if (!hasChanges) {
            return;
        }

        await this._saveAndNotify(tasks);
        Logger.info('Comment scan import completed', { addedCount, updatedCount, scannedFiles: uris.length });
    }

    private async _extractCommentScanEntries(uri: vscode.Uri, relativeFile: string): Promise<CommentScanEntry[]> {
        const fileData = await vscode.workspace.fs.readFile(uri);
        if (fileData.byteLength > TaskService.COMMENT_SCAN_MAX_FILE_SIZE_BYTES) {
            return [];
        }

        const content = Buffer.from(fileData).toString('utf8');
        if (content.includes('\u0000')) {
            return [];
        }

        const entries: CommentScanEntry[] = [];
        const lines = content.split(/\r?\n/);

        lines.forEach((lineContent, index) => {
            const match = lineContent.match(TaskService.COMMENT_MARKER_REGEX);
            if (!match) {
                return;
            }

            const marker = match[1].toUpperCase() as CommentMarker;
            const extractedText = TaskService._normalizeCommentText(match[2]);
            const text = extractedText || `${marker} in ${path.basename(relativeFile)}`;
            const source: CommentScanSource = {
                type: 'comment-scan',
                file: relativeFile,
                line: index + 1,
                marker
            };
            const sourceKey = TaskService._buildCommentSourceKey(source.file, source.line, source.marker);
            const description = `[${marker}] ${relativeFile}:${source.line}`;

            entries.push({
                sourceKey,
                source,
                text,
                description,
                tags: [marker.toLowerCase()]
            });
        });

        return entries;
    }

    private _syncCommentTask(task: TodoItem, entry: CommentScanEntry): boolean {
        let changed = false;

        if (task.text !== entry.text) {
            task.text = entry.text;
            changed = true;
        }

        if (task.description !== entry.description) {
            task.description = entry.description;
            changed = true;
        }

        if (JSON.stringify(task.source) !== JSON.stringify(entry.source)) {
            task.source = entry.source;
            changed = true;
        }

        return changed;
    }

    private static _priorityFromMarker(marker: CommentMarker): Priority {
        switch (marker) {
            case 'FIXME':
                return 'Must';
            case 'NOTE':
                return 'Could';
            case 'TODO':
            default:
                return 'Should';
        }
    }

    private static _normalizeCommentText(rawCommentText: string | undefined): string {
        if (!rawCommentText) {
            return '';
        }

        return rawCommentText.replace(/\*\/\s*$/, '').trim().replace(/\s+/g, ' ');
    }

    private static _buildCommentSourceKey(file: string, line: number, marker: CommentMarker): string {
        return `${file}:${line}:${marker}`;
    }

    private static _createCommentTaskId(sourceKey: string): string {
        let hash = 2166136261;
        for (let i = 0; i < sourceKey.length; i += 1) {
            hash ^= sourceKey.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return `scan-${(hash >>> 0).toString(36)}`;
    }

    private static _shouldSkipUriByExtension(uri: vscode.Uri): boolean {
        const extension = path.extname(uri.fsPath || '').toLowerCase();
        return TaskService.COMMENT_SCAN_BINARY_EXTENSIONS.has(extension);
    }

    private static _normalizeCommentSource(source: unknown): CommentScanSource | undefined {
        if (!source || typeof source !== 'object') {
            return undefined;
        }

        const sourceData = source as Partial<CommentScanSource>;
        if (sourceData.type !== 'comment-scan') {
            return undefined;
        }

        if (typeof sourceData.file !== 'string' || !sourceData.file.trim()) {
            return undefined;
        }

        if (typeof sourceData.line !== 'number' || !Number.isFinite(sourceData.line) || sourceData.line < 1) {
            return undefined;
        }

        if (!sourceData.marker || !['TODO', 'FIXME', 'NOTE'].includes(sourceData.marker)) {
            return undefined;
        }

        return {
            type: 'comment-scan',
            file: sourceData.file,
            line: Math.floor(sourceData.line),
            marker: sourceData.marker as CommentMarker
        };
    }

    private static _normalizeTags(tags: string[] | undefined): string[] | undefined {
        if (!Array.isArray(tags)) {
            return undefined;
        }

        const seen = new Set<string>();
        const normalized: string[] = [];

        for (const tag of tags) {
            if (typeof tag !== 'string') {
                continue;
            }

            const cleaned = tag.trim().replace(/^#+/, '').replace(/\s+/g, ' ');
            if (!cleaned) {
                continue;
            }

            const dedupeKey = cleaned.toLowerCase();
            if (seen.has(dedupeKey)) {
                continue;
            }

            seen.add(dedupeKey);
            normalized.push(cleaned);
        }

        return normalized.length > 0 ? normalized : undefined;
    }
}
