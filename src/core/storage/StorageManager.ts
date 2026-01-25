import * as vscode from 'vscode';
import { TodoItem, ViewSettings } from '../models';

export class StorageManager {
    private static readonly STORAGE_KEY = 'todo4vcode-tasks';
    private static readonly SETTINGS_KEY = 'todo4vcode-settings';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public async getTasks(): Promise<TodoItem[]> {
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        return state.get<TodoItem[]>(StorageManager.STORAGE_KEY, []);
    }

    public async saveTasks(tasks: TodoItem[]): Promise<void> {
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        await state.update(StorageManager.STORAGE_KEY, tasks);
    }

    public async getSettings(viewType: 'sidebar' | 'full'): Promise<ViewSettings | undefined> {
        const key = viewType === 'sidebar' ? StorageManager.SETTINGS_KEY : `${StorageManager.SETTINGS_KEY}-full`;
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        return state.get<ViewSettings>(key);
    }

    public async saveSettings(viewType: 'sidebar' | 'full', settings: ViewSettings): Promise<void> {
        const key = viewType === 'sidebar' ? StorageManager.SETTINGS_KEY : `${StorageManager.SETTINGS_KEY}-full`;
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        await state.update(key, settings);
    }
}
