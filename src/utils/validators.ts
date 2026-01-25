import { WebviewMessage, AddTaskMessage, UpdateStatusMessage, UpdatePriorityMessage } from '../core/models/webview-messages';
import { Priority, Status } from '../core/models/task';
import { Logger } from './logger';

export class MessageValidator {
    public static validate(message: unknown): message is WebviewMessage {
        if (!message || typeof message !== 'object' || !('type' in message)) {
            Logger.warn('Invalid message: missing type', message);
            return false;
        }

        const msg = message as { type: string; [key: string]: unknown };

        switch (msg.type) {
            case 'addTask':
                return this._validateAddTask(msg);
            case 'updateStatus':
                return this._validateUpdateStatus(msg);
            case 'updatePriority':
                return this._validateUpdatePriority(msg);
            case 'updateTaskText':
                return this._validateUpdateTaskText(msg);
            case 'updateDescription':
                return this._validateUpdateDescription(msg);
            case 'updateDueDate':
                return this._validateUpdateDueDate(msg);
            case 'updateReminders':
                return this._validateUpdateReminders(msg);
            case 'updateOrders':
                return this._validateUpdateOrders(msg);
            case 'deleteTask':
                return this._validateDeleteTask(msg);
            case 'addSubtask':
                return this._validateAddSubtask(msg);
            case 'toggleSubtask':
                return this._validateToggleSubtask(msg);
            case 'deleteSubtask':
                return this._validateDeleteSubtask(msg);
            case 'updateSubtaskText':
                return this._validateUpdateSubtaskText(msg);
            case 'updateSettings':
                return this._validateUpdateSettings(msg);
            case 'ready':
            case 'openFull':
            case 'sendToChat':
            case 'openTaskModal':
                return true;
            default:
                Logger.warn(`Unknown message type: ${msg.type}`);
                return false;
        }
    }

    private static _validateAddTask(msg: { type: string; [key: string]: unknown }): boolean {
        if (!('value' in msg) || typeof msg.value !== 'object' || !msg.value) {
            return false;
        }
        const value = msg.value as { [key: string]: unknown };
        return (
            typeof value.text === 'string' &&
            this._isValidPriority(value.priority) &&
            (value.status === undefined || this._isValidStatus(value.status)) &&
            (value.description === undefined || typeof value.description === 'string') &&
            (value.dueDate === undefined || value.dueDate === null || typeof value.dueDate === 'number') &&
            (value.reminders === undefined || Array.isArray(value.reminders))
        );
    }

    private static _validateUpdateStatus(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && this._isValidStatus(msg.status);
    }

    private static _validateUpdatePriority(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && this._isValidPriority(msg.priority);
    }

    private static _validateUpdateTaskText(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && typeof msg.text === 'string';
    }

    private static _validateUpdateDescription(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && typeof msg.description === 'string';
    }

    private static _validateUpdateDueDate(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && (msg.dueDate === null || typeof msg.dueDate === 'number');
    }

    private static _validateUpdateReminders(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string' && Array.isArray(msg.reminders);
    }

    private static _validateUpdateOrders(msg: { type: string; [key: string]: unknown }): boolean {
        if (!Array.isArray(msg.orders)) {
            return false;
        }
        return msg.orders.every(
            (o: unknown) =>
                typeof o === 'object' &&
                o !== null &&
                'id' in o &&
                'order' in o &&
                typeof (o as { id: unknown }).id === 'string' &&
                typeof (o as { order: unknown }).order === 'number'
        );
    }

    private static _validateDeleteTask(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.id === 'string';
    }

    private static _validateAddSubtask(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.taskId === 'string' && typeof msg.text === 'string';
    }

    private static _validateToggleSubtask(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.taskId === 'string' && typeof msg.subtaskId === 'string';
    }

    private static _validateDeleteSubtask(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.taskId === 'string' && typeof msg.subtaskId === 'string';
    }

    private static _validateUpdateSubtaskText(msg: { type: string; [key: string]: unknown }): boolean {
        return (
            typeof msg.taskId === 'string' &&
            typeof msg.subtaskId === 'string' &&
            typeof msg.text === 'string'
        );
    }

    private static _validateUpdateSettings(msg: { type: string; [key: string]: unknown }): boolean {
        return typeof msg.settings === 'object' && msg.settings !== null;
    }

    private static _isValidPriority(priority: unknown): priority is Priority {
        return priority === 'Must' || priority === 'Should' || priority === 'Could' || priority === 'Wont';
    }

    private static _isValidStatus(status: unknown): status is Status {
        return (
            status === 'Todo' ||
            status === 'Ready' ||
            status === 'In Progress' ||
            status === 'Testing' ||
            status === 'Done'
        );
    }
}
