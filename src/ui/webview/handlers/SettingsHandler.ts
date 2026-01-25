import * as vscode from 'vscode';
import { TaskService } from '../../../core/services/TaskService';
import { UpdateSettingsMessage, ReadyMessage, WebviewMessage, WebviewResponse } from '../../../core/models/webview-messages';
import { BaseHandler } from './BaseHandler';
import { Logger } from '../../../utils/logger';

export class SettingsHandler extends BaseHandler {
    constructor(private readonly _taskService: TaskService) {
        super();
    }

    protected async handle(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        const targetWebview = 'webview' in webview ? webview.webview : webview;

        switch (message.type) {
            case 'updateSettings':
                const settingsMessage = message as UpdateSettingsMessage;
                const viewType = settingsMessage.viewType || 'sidebar';
                await this._taskService.saveSettings(viewType, settingsMessage.settings);
                break;
            case 'ready':
                const readyMessage = message as ReadyMessage;
                const readyViewType = readyMessage.viewType || 'sidebar';
                const tasks = await this._taskService.getTasks();
                const settings = await this._taskService.getSettings(readyViewType);
                const response: WebviewResponse = { type: 'updateTasks', tasks, settings };
                targetWebview.postMessage(response);
                break;
            default:
                Logger.warn(`SettingsHandler received unhandled message type: ${(message as WebviewMessage).type}`);
        }
    }
}
