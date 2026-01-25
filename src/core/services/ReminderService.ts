import * as vscode from 'vscode';
import { TodoItem } from '../models/task';
import { StorageManager } from '../storage/StorageManager';
import { Logger } from '../../utils/logger';

export class ReminderService implements vscode.Disposable {
    private readonly _onReminder = new vscode.EventEmitter<TodoItem>();
    public readonly onReminder = this._onReminder.event;

    private _reminderTimeout: NodeJS.Timeout | undefined;
    private _getTasksCallback: () => Promise<TodoItem[]>;
    private _saveTasksCallback: (tasks: TodoItem[]) => Promise<void>;

    constructor(
        getTasksCallback: () => Promise<TodoItem[]>,
        saveTasksCallback: (tasks: TodoItem[]) => Promise<void>
    ) {
        this._getTasksCallback = getTasksCallback;
        this._saveTasksCallback = saveTasksCallback;
        this._scheduleNextReminder();
    }

    public dispose(): void {
        if (this._reminderTimeout) {
            clearTimeout(this._reminderTimeout);
        }
        this._onReminder.dispose();
    }

    public scheduleNextReminder(): void {
        this._scheduleNextReminder();
    }

    private async _scheduleNextReminder(): Promise<void> {
        if (this._reminderTimeout) {
            clearTimeout(this._reminderTimeout);
        }

        try {
            const tasks = await this._getTasksCallback();
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
                Logger.debug(`Next reminder scheduled in ${delay}ms`);
            }
        } catch (error) {
            Logger.error('Error scheduling next reminder', error);
        }
    }

    private async _processDueReminders(): Promise<void> {
        try {
            const tasks = await this._getTasksCallback();
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
                await this._saveTasksCallback(tasks);
            } else {
                this._scheduleNextReminder();
            }
        } catch (error) {
            Logger.error('Error processing due reminders', error);
            this._scheduleNextReminder();
        }
    }
}
