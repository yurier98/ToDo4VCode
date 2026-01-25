import * as vscode from 'vscode';
import { WebviewMessage, ConfigReadyMessage, UpdateConfigMessage, ExportDataMessage, ImportDataMessage, ClearAllDataMessage } from '../../core/models/webview-messages';
import { TaskService } from '../../core/services/TaskService';
import { StorageManager } from '../../core/storage/StorageManager';
import { ImportExportService } from '../../core/services/ImportExportService';
import { TaskHandler } from './handlers/TaskHandler';
import { SettingsHandler } from './handlers/SettingsHandler';
import { ChatHandler } from './handlers/ChatHandler';
import { ConfigHandler } from './handlers/ConfigHandler';
import { MessageValidator } from '../../utils/validators';
import { Logger } from '../../utils/logger';

export class WebviewMessageRouter {
    private readonly _taskHandler: TaskHandler;
    private readonly _settingsHandler: SettingsHandler;
    private readonly _chatHandler: ChatHandler;
    private readonly _configHandler: ConfigHandler;

    constructor(
        private readonly _taskService: TaskService,
        private readonly _storageManager: StorageManager
    ) {
        this._taskHandler = new TaskHandler(_taskService);
        this._settingsHandler = new SettingsHandler(_taskService);
        this._chatHandler = new ChatHandler();
        const importExportService = new ImportExportService(_taskService, _storageManager);
        this._configHandler = new ConfigHandler(importExportService);
    }

    public async handleMessage(
        message: unknown,
        webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView
    ): Promise<void> {
        if (!message || typeof message !== 'object' || !('type' in message)) {
            Logger.warn('Invalid message received', message);
            return;
        }

        const msg = message as { type: string };

        if (msg.type === 'configReady' || msg.type === 'updateConfig' || msg.type === 'exportData' || msg.type === 'importData' || msg.type === 'clearAllData') {
            await this._configHandler.process(message as ConfigReadyMessage | UpdateConfigMessage | ExportDataMessage | ImportDataMessage | ClearAllDataMessage, webview);
            return;
        }

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
