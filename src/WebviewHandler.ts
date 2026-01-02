import * as vscode from 'vscode';
import { TaskService } from './TaskService';
import { TodoItem, Status, Priority } from './storage';

export class WebviewHandler {
    constructor(private readonly _taskService: TaskService) { }

    public async handleMessage(data: any, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView) {
        const targetWebview = 'webview' in webview ? webview.webview : webview;

        switch (data.type) {
            case 'addTask':
                await this._taskService.addTask(data.value);
                break;
            case 'sendToChat':
                const prompt = `Implement ${data.text}`;
                // Copy to clipboard as a reliable fallback for all editors (Cursor, Antigravity, etc.)
                await vscode.env.clipboard.writeText(prompt);

                try {
                    // This works for VS Code with GitHub Copilot
                    await vscode.commands.executeCommand('workbench.action.chat.open', {
                        query: prompt,
                        isPartialQuery: true // Pre-fills but does not automatically send
                    });
                } catch (e) {
                    // Command not available or doesn't support query in this environment
                }

                vscode.window.showInformationMessage(`Task prompt copied to clipboard! Paste (Cmd+V) it into your AI chat.`);
                break;
            case 'updateStatus':
                await this._taskService.updateStatus(data.id, data.status as Status);
                break;
            case 'updatePriority':
                await this._taskService.updatePriority(data.id, data.priority as Priority);
                break;
            case 'updateTaskText':
                await this._taskService.updateTaskText(data.id, data.text);
                break;
            case 'updateDescription':
                await this._taskService.updateDescription(data.id, data.description);
                break;
            case 'updateDueDate':
                await this._taskService.updateDueDate(data.id, data.dueDate);
                break;
            case 'updateReminders':
                await this._taskService.updateReminders(data.id, data.reminders);
                break;
            case 'deleteTask':
                await this._taskService.deleteTask(data.id);
                break;
            case 'ready':
                const tasks = await this._taskService.getTasks();
                targetWebview.postMessage({ type: 'updateTasks', tasks });
                break;
            case 'openFull':
                vscode.commands.executeCommand('todo4vcode.openFull');
                break;
        }
    }
}
