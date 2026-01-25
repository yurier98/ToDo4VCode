import * as vscode from 'vscode';
import { StorageManager } from '../storage/StorageManager';
import { TodoItem, Priority, Status, ViewSettings } from '../models';
import { ReminderService } from './ReminderService';
import { StatisticsService, TaskStatistics } from './StatisticsService';
import { Logger } from '../../utils/logger';

export class TaskService implements vscode.Disposable {
    private readonly _onTasksChanged = new vscode.EventEmitter<TodoItem[]>();
    public readonly onTasksChanged = this._onTasksChanged.event;

    private readonly _onSettingsChanged = new vscode.EventEmitter<{ viewType: 'sidebar' | 'full', settings: ViewSettings }>();
    public readonly onSettingsChanged = this._onSettingsChanged.event;

    private readonly _reminderService: ReminderService;

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

    public async addTask(taskData: {
        text: string;
        priority: Priority;
        status?: Status;
        description?: string;
        dueDate?: number;
        reminders?: number[];
    }): Promise<TodoItem[]> {
        try {
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

    public async addSubtask(taskId: string, text: string): Promise<TodoItem[]> {
        return this._updateTask(taskId, task => {
            if (!task.subtasks) task.subtasks = [];
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
}
