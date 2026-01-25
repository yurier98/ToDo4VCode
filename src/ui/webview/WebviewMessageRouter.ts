import * as vscode from 'vscode';
import { WebviewMessage } from '../../core/models/webview-messages';
import { TaskService } from '../../core/services/TaskService';
import { TaskHandler } from './handlers/TaskHandler';
import { SettingsHandler } from './handlers/SettingsHandler';
import { ChatHandler } from './handlers/ChatHandler';
import { MessageValidator } from '../../utils/validators';
import { Logger } from '../../utils/logger';

export class WebviewMessageRouter {
    private readonly _taskHandler: TaskHandler;
    private readonly _settingsHandler: SettingsHandler;
    private readonly _chatHandler: ChatHandler;

    constructor(private readonly _taskService: TaskService) {
        this._taskHandler = new TaskHandler(_taskService);
        this._settingsHandler = new SettingsHandler(_taskService);
        this._chatHandler = new ChatHandler();
    }

    public async handleMessage(
        message: unknown,
        webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView
    ): Promise<void> {
        if (!MessageValidator.validate(message)) {
            Logger.warn('Invalid message received', message);
            return;
        }

        const webviewMessage = message as WebviewMessage;

        try {
            switch (webviewMessage.type) {
                case 'addTask':
                case 'updateStatus':
                case 'updatePriority':
                case 'updateTaskText':
                case 'updateDescription':
                case 'updateDueDate':
                case 'updateReminders':
                case 'updateOrders':
                case 'deleteTask':
                case 'addSubtask':
                case 'toggleSubtask':
                case 'deleteSubtask':
                case 'updateSubtaskText':
                    await this._taskHandler.process(webviewMessage, webview);
                    break;
                case 'updateSettings':
                case 'ready':
                    await this._settingsHandler.process(webviewMessage, webview);
                    break;
                case 'sendToChat':
                    await this._chatHandler.process(webviewMessage, webview);
                    break;
                case 'openFull':
                    await vscode.commands.executeCommand('todo4vcode.openFull');
                    break;
                default:
                    Logger.warn(`Unhandled message type: ${webviewMessage.type}`);
            }
        } catch (error) {
            Logger.error(`Error routing message type: ${webviewMessage.type}`, error);
        }
    }
}
