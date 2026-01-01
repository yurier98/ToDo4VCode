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
}

export class StorageManager {
    private static readonly STORAGE_KEY = 'todo4vcode-tasks';

    constructor(private readonly context: vscode.ExtensionContext) { }

    public async getTasks(): Promise<TodoItem[]> {
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        return state.get<TodoItem[]>(StorageManager.STORAGE_KEY, []);
    }

    public async saveTasks(tasks: TodoItem[]): Promise<void> {
        const state = this.context.storageUri ? this.context.workspaceState : this.context.globalState;
        await state.update(StorageManager.STORAGE_KEY, tasks);
    }
}

