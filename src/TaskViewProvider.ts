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
            
            // Reproducir sonido de notificación
            this._playNotificationSound();
            
            vscode.window.showInformationMessage(message, MESSAGES.VIEW_TASK).then(selection => {
                if (selection === MESSAGES.VIEW_TASK) {
                    // Abrir en vista completa y mostrar el modal de la tarea
                    vscode.commands.executeCommand('todo4vcode.openFull').then(() => {
                        // Esperar un momento para que el webview esté listo
                        setTimeout(() => {
                            vscode.commands.executeCommand('todo4vcode.openTaskModal', task.id);
                        }, 500);
                    });
                }
            });
        });

        this._taskService.onTasksChanged(tasks => {
            this._updateWebview(tasks);
        });

        this._taskService.onSettingsChanged(data => {
            if (data.viewType === 'sidebar') {
                this._updateWebviewWithSettings(data.settings);
            }
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
        webviewView.webview.html = TaskWebview.getHtml(webviewView.webview, this._extensionUri, tasks, 'sidebar');

        webviewView.webview.onDidReceiveMessage(data => this._webviewHandler.handleMessage(data, webviewView));
    }

    public async refresh() {
        if (this._view) {
            const tasks = await this._taskService.getTasks();
            const settings = await this._taskService.getSettings('sidebar');
            this._view.webview.postMessage({ type: 'updateTasks', tasks, settings });
        }
    }

    private _updateWebview(tasks: any[]) {
        if (this._view) {
            this._taskService.getSettings('sidebar').then(settings => {
                this._view!.webview.postMessage({ type: 'updateTasks', tasks, settings });
            });
        }
    }

    private _updateWebviewWithSettings(settings: any) {
        if (this._view) {
            this._taskService.getTasks().then(tasks => {
                this._view!.webview.postMessage({ type: 'updateTasks', tasks, settings });
            });
        }
    }

    private _playNotificationSound() {
        try {
            const soundPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'ding-ding-alert.mp3');
            const soundUri = soundPath.fsPath;
            
            // Usar comando del sistema para reproducir el sonido
            const { execFile } = require('child_process');
            
            if (process.platform === 'darwin') {
                // macOS
                execFile('afplay', [soundUri], { timeout: 5000 });
            } else if (process.platform === 'win32') {
                // Windows - Usando Windows Media Player via PowerShell para soportar MP3
                const command = `(New-Object Media.SoundPlayer '${soundUri}').Play();`;
                // Nota: SoundPlayer solo soporta WAV. Para MP3 en Windows:
                const mp3Command = `Add-Type -AssemblyName presentationCore; $player = New-Object system.windows.media.mediaplayer; $player.open('${soundUri}'); $player.Play(); Start-Sleep 5;`;
                execFile('powershell', ['-c', mp3Command], { timeout: 5000 });
            } else {
                // Linux
                execFile('ffplay', ['-nodisp', '-autoexit', soundUri], { timeout: 5000 });
            }
        } catch (error) {
            // Si hay error al reproducir sonido, solo ignora silenciosamente
            console.debug('Sound playback error:', error);
        }
    }
}
