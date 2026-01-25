import * as vscode from 'vscode';
import { TaskService } from '../../core/services/TaskService';
import { TaskWebview } from '../webview/TaskWebview';
import { WebviewMessageRouter } from '../webview/WebviewMessageRouter';
import { Logger } from '../../utils/logger';
import { MEDIA_PATHS } from '../../core/constants/media-paths';

export class FullScreenPanel implements vscode.Disposable {
    private _panel: vscode.WebviewPanel | undefined;
    private _taskChangeSubscription: vscode.Disposable | undefined;
    private _settingsChangeSubscription: vscode.Disposable | undefined;
    private readonly _messageRouter: WebviewMessageRouter;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private readonly _taskService: TaskService
    ) {
        this._messageRouter = new WebviewMessageRouter(_taskService);
    }

    public async reveal(): Promise<void> {
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        await this._createPanel();
    }

    public async openTaskModal(taskId: string): Promise<void> {
        if (this._panel) {
            this._panel.webview.postMessage({ type: 'openTaskModal', taskId });
        }
    }

    private async _createPanel(): Promise<void> {
        try {
            this._panel = vscode.window.createWebviewPanel(
                'todo4vcodeFull',
                'ToDo4VCode',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [this._extensionUri],
                    retainContextWhenHidden: true
                }
            );

            this._panel.iconPath = {
                light: vscode.Uri.joinPath(this._extensionUri, MEDIA_PATHS.ICON),
                dark: vscode.Uri.joinPath(this._extensionUri, MEDIA_PATHS.ICON)
            };

            await this._updatePanel();

            this._panel.webview.onDidReceiveMessage(async (data) => {
                if (this._panel) {
                    if (data.type === 'ready' || data.type === 'updateSettings') {
                        data.viewType = 'full';
                    }
                    await this._messageRouter.handleMessage(data, this._panel);
                }
            });

            this._taskChangeSubscription = this._taskService.onTasksChanged(async (tasks) => {
                if (this._panel) {
                    try {
                        const settings = await this._taskService.getSettings('full');
                        this._panel.webview.postMessage({ type: 'updateTasks', tasks, settings });
                    } catch (error) {
                        Logger.error('Error updating full screen panel on task change', error);
                    }
                }
            });

            this._settingsChangeSubscription = this._taskService.onSettingsChanged(async (data) => {
                if (this._panel && data.viewType === 'full') {
                    try {
                        const tasks = await this._taskService.getTasks();
                        this._panel.webview.postMessage({ type: 'updateTasks', tasks, settings: data.settings });
                    } catch (error) {
                        Logger.error('Error updating full screen panel on settings change', error);
                    }
                }
            });

            this._panel.onDidDispose(() => {
                this._taskChangeSubscription?.dispose();
                this._settingsChangeSubscription?.dispose();
                this._panel = undefined;
            });
        } catch (error) {
            Logger.error('Error creating full screen panel', error);
        }
    }

    private async _updatePanel(): Promise<void> {
        if (this._panel) {
            const tasks = await this._taskService.getTasks();
            this._panel.webview.html = TaskWebview.getHtml(
                this._panel.webview,
                this._extensionUri,
                tasks,
                'full'
            );
        }
    }

    public dispose(): void {
        this._taskChangeSubscription?.dispose();
        this._settingsChangeSubscription?.dispose();
        this._panel?.dispose();
        this._panel = undefined;
    }
}
