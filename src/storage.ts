import * as vscode from 'vscode';

export type Priority = 'Must' | 'Should' | 'Could' | 'Won\'t';
export type Status = 'Todo' | 'Ready' | 'In Progress' | 'Testing' | 'Done';

export interface TodoItem {
    id: string;
    text: string;
    description?: string;
    priority: Priority;
    status: Status;
    dueDate?: number;
    reminders?: number[];
    completed: boolean;
    createdAt: number;
    order?: number;
}

export interface ViewSettings {
    viewMode: 'list' | 'kanban';
    groupBy: 'status' | 'priority';
    hideCompleted: boolean;
    sortBy: 'custom' | 'priority' | 'dueDate';
    collapsedSections: string[];
}

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

