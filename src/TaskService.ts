import * as vscode from 'vscode';
import { StorageManager, TodoItem, Priority, Status } from './storage';

export class TaskService implements vscode.Disposable {
    private readonly _onTasksChanged = new vscode.EventEmitter<TodoItem[]>();
    public readonly onTasksChanged = this._onTasksChanged.event;

    private readonly _onReminder = new vscode.EventEmitter<TodoItem>();
    public readonly onReminder = this._onReminder.event;

    private _reminderTimeout: NodeJS.Timeout | undefined;

    constructor(private readonly _storageManager: StorageManager) {
        this._scheduleNextReminder();
    }

    public dispose() {
        if (this._reminderTimeout) {
            clearTimeout(this._reminderTimeout);
        }
        this._onTasksChanged.dispose();
        this._onReminder.dispose();
    }

    public async getTasks(): Promise<TodoItem[]> {
        const tasks = await this._storageManager.getTasks();
        let changed = false;
        tasks.forEach((t, i) => {
            if (t.order === undefined) {
                t.order = (i + 1) * 1000;
                changed = true;
            }
        });
        if (changed) {
            await this._storageManager.saveTasks(tasks);
        }
        return tasks;
    }

    public async addTask(taskData: {
        text: string,
        priority: Priority,
        status?: Status,
        description?: string,
        dueDate?: number,
        reminders?: number[]
    }): Promise<TodoItem[]> {
        const tasks = await this.getTasks();
        const newTask: TodoItem = {
            id: Math.random().toString(36).substring(2, 11),
            text: taskData.text,
            description: taskData.description,
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
    }

    public async updateOrder(id: string, newOrder: number): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.order = newOrder;
        });
    }

    public async updateOrders(orders: { id: string, order: number }[]): Promise<TodoItem[]> {
        const tasks = await this.getTasks();
        orders.forEach(o => {
            const task = tasks.find(t => t.id === o.id);
            if (task) task.order = o.order;
        });
        await this._saveAndNotify(tasks);
        return tasks;
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
        return this._updateTask(id, task => {
            task.text = text;
        });
    }

    public async updateDescription(id: string, description: string): Promise<TodoItem[]> {
        return this._updateTask(id, task => {
            task.description = description;
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
        let tasks = await this.getTasks();
        tasks = tasks.filter(t => t.id !== id);
        await this._saveAndNotify(tasks);
        return tasks;
    }

    private async _updateTask(id: string, updater: (task: TodoItem) => void): Promise<TodoItem[]> {
        const tasks = await this.getTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
            updater(task);
            await this._saveAndNotify(tasks);
        }
        return tasks;
    }

    private async _saveAndNotify(tasks: TodoItem[]) {
        await this._storageManager.saveTasks(tasks);
        this._onTasksChanged.fire(tasks);
        this._scheduleNextReminder();
    }

    private async _scheduleNextReminder() {
        if (this._reminderTimeout) {
            clearTimeout(this._reminderTimeout);
        }

        const tasks = await this.getTasks();
        const now = Date.now();
        let nextReminderTime = Number.MAX_SAFE_INTEGER;
        let hasReminders = false;

        for (const task of tasks) {
            if (task.reminders && task.reminders.length > 0) {
                for (const r of task.reminders) {
                    if (r < nextReminderTime && r > now - 500) {
                        nextReminderTime = r;
                        hasReminders = true;
                    }
                }
            }
        }

        if (hasReminders) {
            const delay = Math.max(0, nextReminderTime - now);
            this._reminderTimeout = setTimeout(() => this._processDueReminders(), delay);
        }
    }

    private async _processDueReminders() {
        const tasks = await this.getTasks();
        const now = Date.now();
        let changed = false;

        for (const task of tasks) {
            if (task.reminders && task.reminders.length > 0) {
                const dueReminders = task.reminders.filter(r => r <= now + 1000);
                if (dueReminders.length > 0) {
                    this._onReminder.fire(task);
                    task.reminders = task.reminders.filter(r => r > now + 1000);
                    changed = true;
                }
            }
        }

        if (changed) {
            await this._saveAndNotify(tasks);
        } else {
            this._scheduleNextReminder();
        }
    }
}
