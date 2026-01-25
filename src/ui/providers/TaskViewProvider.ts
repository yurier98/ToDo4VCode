import * as vscode from 'vscode';
import { TaskService } from '../../core/services/TaskService';
import { TaskWebview } from '../webview/TaskWebview';
import { WebviewMessageRouter } from '../webview/WebviewMessageRouter';
import { SoundPlayer } from '../../utils/sound-player';
import { MESSAGES } from '../../constants';
import { Logger } from '../../utils/logger';

export class TaskViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'todo4vcode-view';

    private _view?: vscode.WebviewView;
    private readonly _messageRouter: WebviewMessageRouter;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _taskService: TaskService
    ) {
        this._messageRouter = new WebviewMessageRouter(this._taskService);

        this._taskService.onReminder((task) => {
            const message = MESSAGES.TASK_REMINDER.replace('{0}', task.text);

            SoundPlayer.playNotificationSound(this._extensionUri);

            vscode.window.showInformationMessage(message, MESSAGES.VIEW_TASK).then((selection) => {
                if (selection === MESSAGES.VIEW_TASK) {
                    vscode.commands.executeCommand('todo4vcode.openFull').then(() => {
                        setTimeout(() => {
                            vscode.commands.executeCommand('todo4vcode.openTaskModal', task.id);
                        }, 500);
                    });
                }
            });
        });

        this._taskService.onTasksChanged((tasks) => {
            this._updateWebview(tasks);
        });

        this._taskService.onSettingsChanged((data) => {
            if (data.viewType === 'sidebar') {
                this._updateWebviewWithSettings(data.settings);
            }
        });
    }

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): Promise<void> {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        try {
            const tasks = await this._taskService.getTasks();
            webviewView.webview.html = TaskWebview.getHtml(
                webviewView.webview,
                this._extensionUri,
                tasks,
                'sidebar'
            );

            webviewView.webview.onDidReceiveMessage((data) =>
                this._messageRouter.handleMessage(data, webviewView)
            );
        } catch (error) {
            Logger.error('Error resolving webview view', error);
        }
    }

    public async refresh(): Promise<void> {
        if (this._view) {
            try {
                const tasks = await this._taskService.getTasks();
                const settings = await this._taskService.getSettings('sidebar');
                this._view.webview.postMessage({ type: 'updateTasks', tasks, settings });
            } catch (error) {
                Logger.error('Error refreshing webview', error);
            }
        }
    }

    private _updateWebview(tasks: unknown[]): void {
        if (this._view) {
            this._taskService
                .getSettings('sidebar')
                .then((settings) => {
                    this._view!.webview.postMessage({ type: 'updateTasks', tasks, settings });
                })
                .catch((error) => {
                    Logger.error('Error updating webview', error);
                });
        }
    }

    private _updateWebviewWithSettings(settings: unknown): void {
        if (this._view) {
            this._taskService
                .getTasks()
                .then((tasks) => {
                    this._view!.webview.postMessage({ type: 'updateTasks', tasks, settings });
                })
                .catch((error) => {
                    Logger.error('Error updating webview with settings', error);
                });
        }
    }
}
