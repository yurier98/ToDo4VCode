import * as vscode from 'vscode';
import * as path from 'path';
import { TodoItem, ViewSettings } from '../models';
import { Logger } from '../../utils/logger';

interface SharedTasksFilePayload {
    format: string;
    version: string;
    tasks: TodoItem[];
}

export interface SharedTasksChangedEvent {
    reason: 'external' | 'mode-change';
}

export class StorageManager implements vscode.Disposable {
    private static readonly CONFIG_SECTION = 'todo4vcode';
    private static readonly SHARED_TASKS_DEFAULT_PATH = '.todo4vcode/shared-tasks.json';
    private static readonly SHARED_TASKS_FORMAT = 'todo4vcode-shared-tasks';
    private static readonly SHARED_TASKS_VERSION = '1.0.0';
    private static readonly STORAGE_KEY = 'todo4vcode-tasks';
    private static readonly SETTINGS_KEY = 'todo4vcode-settings';
    private static readonly WATCHER_IGNORE_WINDOW_MS = 1500;

    private readonly _onSharedTasksChanged = new vscode.EventEmitter<SharedTasksChangedEvent>();
    public readonly onSharedTasksChanged = this._onSharedTasksChanged.event;

    private _sharedWatcher: vscode.FileSystemWatcher | undefined;
    private readonly _disposables: vscode.Disposable[] = [];
    private _watcherDisposables: vscode.Disposable[] = [];
    private _ignoreSharedWatcherEventsUntil = 0;
    private _lastSharedEnabled: boolean;
    private _lastSharedPath: string;
    private _lastValidSharedTasks: TodoItem[] = [];
    private _hasLastValidSharedTasks = false;
    private readonly _initializedSharedUris = new Set<string>();
    private readonly _invalidSharedFileWarningByUri = new Set<string>();

    constructor(private readonly context: vscode.ExtensionContext) {
        this._lastSharedEnabled = this._getSharedTasksEnabled();
        this._lastSharedPath = this._getSharedTasksPath();

        this._disposables.push(
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration(`${StorageManager.CONFIG_SECTION}.sharedTasks`)) {
                    void this._handleSharedTasksConfigurationChange();
                }
            })
        );

        void this._configureSharedTasksWatcher();
    }

    public dispose(): void {
        this._watcherDisposables.forEach((disposable) => disposable.dispose());
        this._watcherDisposables = [];
        this._sharedWatcher?.dispose();
        this._sharedWatcher = undefined;
        this._onSharedTasksChanged.dispose();
        this._disposables.forEach((disposable) => disposable.dispose());
    }

    public async getTasks(): Promise<TodoItem[]> {
        const sharedTasksUri = await this._getActiveSharedTasksUri();
        if (sharedTasksUri) {
            await this._ensureSharedTasksFileInitialized(sharedTasksUri);
            return this._readSharedTasksFromUri(sharedTasksUri);
        }

        return this._readTasksFromState();
    }

    public async saveTasks(tasks: TodoItem[]): Promise<void> {
        const sharedTasksUri = await this._getActiveSharedTasksUri();
        if (sharedTasksUri) {
            await this._writeSharedTasksToUri(sharedTasksUri, tasks);
            this._initializedSharedUris.add(sharedTasksUri.toString());
            return;
        }

        await this._writeTasksToState(tasks);
    }

    public async getSettings(viewType: 'sidebar' | 'full'): Promise<ViewSettings | undefined> {
        const key = viewType === 'sidebar' ? StorageManager.SETTINGS_KEY : `${StorageManager.SETTINGS_KEY}-full`;
        const state = this._getStateStore();
        return state.get<ViewSettings>(key);
    }

    public async saveSettings(viewType: 'sidebar' | 'full', settings: ViewSettings): Promise<void> {
        const key = viewType === 'sidebar' ? StorageManager.SETTINGS_KEY : `${StorageManager.SETTINGS_KEY}-full`;
        const state = this._getStateStore();
        await state.update(key, settings);
    }

    public async clearAllSettings(): Promise<void> {
        const state = this._getStateStore();
        await state.update(StorageManager.SETTINGS_KEY, undefined);
        await state.update(`${StorageManager.SETTINGS_KEY}-full`, undefined);
    }

    private _getStateStore(): vscode.Memento {
        return this.context.storageUri ? this.context.workspaceState : this.context.globalState;
    }

    private async _readTasksFromState(): Promise<TodoItem[]> {
        const state = this._getStateStore();
        return state.get<TodoItem[]>(StorageManager.STORAGE_KEY, []);
    }

    private async _writeTasksToState(tasks: TodoItem[]): Promise<void> {
        const state = this._getStateStore();
        await state.update(StorageManager.STORAGE_KEY, tasks);
    }

    private _getSharedTasksEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(`${StorageManager.CONFIG_SECTION}.sharedTasks`);
        return config.get<boolean>('enabled', false);
    }

    private _getSharedTasksPath(): string {
        const config = vscode.workspace.getConfiguration(`${StorageManager.CONFIG_SECTION}.sharedTasks`);
        return config.get<string>('path', StorageManager.SHARED_TASKS_DEFAULT_PATH);
    }

    private async _getActiveSharedTasksUri(): Promise<vscode.Uri | undefined> {
        if (!this._getSharedTasksEnabled()) {
            return undefined;
        }

        return this._resolveSharedTasksUri(this._getSharedTasksPath());
    }

    private _resolveSharedTasksUri(configuredPath: string): vscode.Uri | undefined {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return undefined;
        }

        const normalizedPath = (configuredPath || StorageManager.SHARED_TASKS_DEFAULT_PATH)
            .trim()
            .replace(/\\/g, '/');

        if (
            !normalizedPath ||
            path.isAbsolute(normalizedPath) ||
            normalizedPath.startsWith('../') ||
            normalizedPath.includes('/../') ||
            normalizedPath.endsWith('/..')
        ) {
            Logger.warn('Shared tasks path must be relative to workspace root', { configuredPath });
            return undefined;
        }

        const segments = normalizedPath.split('/').filter(Boolean);
        if (segments.length === 0) {
            return undefined;
        }

        return vscode.Uri.joinPath(workspaceFolder.uri, ...segments);
    }

    private async _ensureSharedTasksFileInitialized(sharedUri: vscode.Uri): Promise<void> {
        const uriKey = sharedUri.toString();
        if (this._initializedSharedUris.has(uriKey)) {
            return;
        }

        const exists = await this._fileExists(sharedUri);
        if (!exists) {
            const localTasks = await this._readTasksFromState();
            await this._writeSharedTasksToUri(sharedUri, localTasks);
            Logger.info('Initialized shared tasks file from local workspace data', {
                file: sharedUri.fsPath,
                taskCount: localTasks.length
            });
        } else {
            await this._readSharedTasksFromUri(sharedUri, true);
        }

        this._initializedSharedUris.add(uriKey);
    }

    private async _readSharedTasksFromUri(sharedUri: vscode.Uri, silent = false): Promise<TodoItem[]> {
        try {
            const fileData = await vscode.workspace.fs.readFile(sharedUri);
            const parsedData = JSON.parse(Buffer.from(fileData).toString('utf8')) as unknown;
            const tasks = this._extractTasksFromSharedFile(parsedData);

            this._lastValidSharedTasks = tasks;
            this._hasLastValidSharedTasks = true;
            this._invalidSharedFileWarningByUri.delete(sharedUri.toString());
            return tasks;
        } catch (error) {
            if (this._isFileNotFoundError(error)) {
                this._lastValidSharedTasks = [];
                this._hasLastValidSharedTasks = true;
                return [];
            }

            Logger.error('Failed to read shared tasks file', error, sharedUri.fsPath);

            const sharedUriKey = sharedUri.toString();
            if (!silent && !this._invalidSharedFileWarningByUri.has(sharedUriKey)) {
                vscode.window.showErrorMessage(
                    'Shared tasks file is invalid JSON. Keeping last valid tasks until it is fixed.'
                );
                this._invalidSharedFileWarningByUri.add(sharedUriKey);
            }

            if (this._hasLastValidSharedTasks) {
                return [...this._lastValidSharedTasks];
            }

            return [];
        }
    }

    private _extractTasksFromSharedFile(data: unknown): TodoItem[] {
        if (Array.isArray(data)) {
            return data as TodoItem[];
        }

        if (typeof data !== 'object' || data === null) {
            throw new Error('Shared tasks payload is not an object.');
        }

        const payload = data as Record<string, unknown>;
        if (Array.isArray(payload.tasks)) {
            return payload.tasks as TodoItem[];
        }

        if (
            'data' in payload &&
            typeof payload.data === 'object' &&
            payload.data !== null &&
            Array.isArray((payload.data as Record<string, unknown>).tasks)
        ) {
            return (payload.data as Record<string, unknown>).tasks as TodoItem[];
        }

        throw new Error('Shared tasks payload has no tasks array.');
    }

    private async _writeSharedTasksToUri(sharedUri: vscode.Uri, tasks: TodoItem[]): Promise<void> {
        await this._ensureParentDirectoryExists(sharedUri);

        const payload: SharedTasksFilePayload = {
            format: StorageManager.SHARED_TASKS_FORMAT,
            version: StorageManager.SHARED_TASKS_VERSION,
            tasks
        };

        const jsonContent = JSON.stringify(payload, null, 2);
        this._ignoreSharedWatcherEventsUntil = Date.now() + StorageManager.WATCHER_IGNORE_WINDOW_MS;
        await vscode.workspace.fs.writeFile(sharedUri, Buffer.from(jsonContent, 'utf8'));

        this._lastValidSharedTasks = tasks;
        this._hasLastValidSharedTasks = true;
        this._invalidSharedFileWarningByUri.delete(sharedUri.toString());
    }

    private async _ensureParentDirectoryExists(sharedUri: vscode.Uri): Promise<void> {
        const parentPath = path.posix.dirname(sharedUri.path);
        const parentUri = sharedUri.with({ path: parentPath });
        await vscode.workspace.fs.createDirectory(parentUri);
    }

    private async _handleSharedTasksConfigurationChange(): Promise<void> {
        const previousEnabled = this._lastSharedEnabled;
        const previousPath = this._lastSharedPath;
        const previousUri = previousEnabled ? this._resolveSharedTasksUri(previousPath) : undefined;
        const previousTasks = previousUri
            ? await this._readSharedTasksFromUri(previousUri, true)
            : await this._readTasksFromState();

        this._lastSharedEnabled = this._getSharedTasksEnabled();
        this._lastSharedPath = this._getSharedTasksPath();

        const currentEnabled = this._lastSharedEnabled;
        const currentPath = this._lastSharedPath;
        const currentUri = currentEnabled ? this._resolveSharedTasksUri(currentPath) : undefined;

        if (currentEnabled && currentUri) {
            const currentUriKey = currentUri.toString();
            const fileExists = await this._fileExists(currentUri);
            if (!fileExists) {
                await this._writeSharedTasksToUri(currentUri, previousTasks);
                Logger.info('Migrated tasks into shared tasks file', {
                    file: currentUri.fsPath,
                    taskCount: previousTasks.length
                });
            } else {
                await this._readSharedTasksFromUri(currentUri, true);
            }

            this._initializedSharedUris.add(currentUriKey);
        }

        if (previousEnabled && !currentEnabled) {
            await this._writeTasksToState(previousTasks);
        }

        await this._configureSharedTasksWatcher();

        if (previousEnabled !== currentEnabled || previousPath !== currentPath) {
            this._onSharedTasksChanged.fire({ reason: 'mode-change' });
        }
    }

    private async _configureSharedTasksWatcher(): Promise<void> {
        this._watcherDisposables.forEach((disposable) => disposable.dispose());
        this._watcherDisposables = [];
        this._sharedWatcher?.dispose();
        this._sharedWatcher = undefined;

        const sharedUri = await this._getActiveSharedTasksUri();
        if (!sharedUri) {
            return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return;
        }

        const relativePath = this._toFolderRelativePath(workspaceFolder.uri, sharedUri);
        if (!relativePath) {
            return;
        }

        const pattern = new vscode.RelativePattern(workspaceFolder, relativePath);
        this._sharedWatcher = vscode.workspace.createFileSystemWatcher(pattern);

        this._watcherDisposables.push(
            this._sharedWatcher.onDidCreate(() => this._notifySharedTasksFileChangedExternally()),
            this._sharedWatcher.onDidChange(() => this._notifySharedTasksFileChangedExternally()),
            this._sharedWatcher.onDidDelete(() => this._notifySharedTasksFileChangedExternally())
        );
    }

    private _notifySharedTasksFileChangedExternally(): void {
        if (Date.now() < this._ignoreSharedWatcherEventsUntil) {
            return;
        }

        this._onSharedTasksChanged.fire({ reason: 'external' });
    }

    private _toFolderRelativePath(workspaceRoot: vscode.Uri, target: vscode.Uri): string | undefined {
        const relativePath = path.posix.relative(workspaceRoot.path, target.path);
        if (!relativePath || relativePath.startsWith('..') || path.posix.isAbsolute(relativePath)) {
            return undefined;
        }

        return relativePath;
    }

    private async _fileExists(uri: vscode.Uri): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(uri);
            return true;
        } catch (error) {
            if (this._isFileNotFoundError(error)) {
                return false;
            }
            throw error;
        }
    }

    private _isFileNotFoundError(error: unknown): boolean {
        return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
    }
}
