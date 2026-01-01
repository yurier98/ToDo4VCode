import * as vscode from 'vscode';
import { TaskService } from './TaskService';
import { TaskWebview } from './webview';
import { WebviewHandler } from './WebviewHandler';
import { MESSAGES } from './constants';

export class TaskViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'todo4vcode-view';

    private _view?: vscode.WebviewView;
    private readonly _webviewHandler: WebviewHandler;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _taskService: TaskService
    ) {
        this._webviewHandler = new WebviewHandler(this._taskService);

        this._taskService.onReminder(task => {
            const message = MESSAGES.TASK_REMINDER.replace('{0}', task.text);
            vscode.window.showInformationMessage(message, MESSAGES.VIEW_TASK).then(selection => {
                if (selection === MESSAGES.VIEW_TASK) {
                    vscode.commands.executeCommand('todo4vcode-view.focus');
                }
            });
        });

        this._taskService.onTasksChanged(tasks => {
            this._updateWebview(tasks);
        });
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        const tasks = await this._taskService.getTasks();
        webviewView.webview.html = TaskWebview.getHtml(webviewView.webview, this._extensionUri, tasks);

        webviewView.webview.onDidReceiveMessage(data => this._webviewHandler.handleMessage(data, webviewView));
    }

    public async refresh() {
        if (this._view) {
            const tasks = await this._taskService.getTasks();
            this._updateWebview(tasks);
        }
    }

    private _updateWebview(tasks: any[]) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'updateTasks', tasks });
        }
    }
}
