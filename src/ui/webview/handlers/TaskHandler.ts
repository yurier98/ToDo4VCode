import * as vscode from 'vscode';
import { TaskService } from '../../../core/services/TaskService';
import {
    AddTaskMessage,
    UpdateStatusMessage,
    UpdatePriorityMessage,
    UpdateTaskTextMessage,
    UpdateDescriptionMessage,
    UpdateDueDateMessage,
    UpdateRemindersMessage,
    UpdateOrdersMessage,
    DeleteTaskMessage,
    AddSubtaskMessage,
    ToggleSubtaskMessage,
    DeleteSubtaskMessage,
    UpdateSubtaskTextMessage,
    WebviewMessage
} from '../../../core/models/webview-messages';
import { BaseHandler } from './BaseHandler';
import { Logger } from '../../../utils/logger';

export class TaskHandler extends BaseHandler {
    constructor(private readonly _taskService: TaskService) {
        super();
    }

    protected async handle(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        const targetWebview = 'webview' in webview ? webview.webview : webview;

        switch (message.type) {
            case 'addTask':
                await this._taskService.addTask((message as AddTaskMessage).value);
                break;
            case 'updateStatus':
                await this._taskService.updateStatus((message as UpdateStatusMessage).id, (message as UpdateStatusMessage).status);
                break;
            case 'updatePriority':
                await this._taskService.updatePriority((message as UpdatePriorityMessage).id, (message as UpdatePriorityMessage).priority);
                break;
            case 'updateTaskText':
                await this._taskService.updateTaskText((message as UpdateTaskTextMessage).id, (message as UpdateTaskTextMessage).text);
                break;
            case 'updateDescription':
                await this._taskService.updateDescription((message as UpdateDescriptionMessage).id, (message as UpdateDescriptionMessage).description);
                break;
            case 'updateDueDate':
                await this._taskService.updateDueDate((message as UpdateDueDateMessage).id, (message as UpdateDueDateMessage).dueDate);
                break;
            case 'updateReminders':
                await this._taskService.updateReminders((message as UpdateRemindersMessage).id, (message as UpdateRemindersMessage).reminders);
                break;
            case 'updateOrders':
                await this._taskService.updateOrders((message as UpdateOrdersMessage).orders);
                break;
            case 'deleteTask':
                await this._taskService.deleteTask((message as DeleteTaskMessage).id);
                break;
            case 'addSubtask':
                await this._taskService.addSubtask((message as AddSubtaskMessage).taskId, (message as AddSubtaskMessage).text);
                break;
            case 'toggleSubtask':
                await this._taskService.toggleSubtask((message as ToggleSubtaskMessage).taskId, (message as ToggleSubtaskMessage).subtaskId);
                break;
            case 'deleteSubtask':
                await this._taskService.deleteSubtask((message as DeleteSubtaskMessage).taskId, (message as DeleteSubtaskMessage).subtaskId);
                break;
            case 'updateSubtaskText':
                await this._taskService.updateSubtaskText(
                    (message as UpdateSubtaskTextMessage).taskId,
                    (message as UpdateSubtaskTextMessage).subtaskId,
                    (message as UpdateSubtaskTextMessage).text
                );
                break;
            default:
                Logger.warn(`TaskHandler received unhandled message type: ${(message as WebviewMessage).type}`);
        }
    }
}
