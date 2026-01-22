import * as vscode from 'vscode';
import { StorageManager, TodoItem } from './storage';
import { TaskService } from './TaskService';
import { TaskViewProvider } from './TaskViewProvider';
import { TaskWebview } from './webview';
import { WebviewHandler } from './WebviewHandler';
import { MESSAGES } from './constants';

export function activate(context: vscode.ExtensionContext) {
    const storageManager = new StorageManager(context);
    const taskService = new TaskService(storageManager);
    const webviewHandler = new WebviewHandler(taskService);
    const provider = new TaskViewProvider(context.extensionUri, taskService);

    context.subscriptions.push(taskService);

    // Variable para almacenar el panel full screen
    let fullScreenPanel: vscode.WebviewPanel | undefined;

    // Create Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = async (tasks: TodoItem[]) => {
        const total = tasks.length;
        const mustCount = tasks.filter(t => t.priority === 'Must' && t.status !== 'Done').length;
        const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;

        // Obtener estadísticas completas para el tooltip
        const statistics = await taskService.getStatistics();
        const config = vscode.workspace.getConfiguration('todo4vcode.stats');
        
        if (total === 0) {
            statusBarItem.text = `$(checklist) ${MESSAGES.NO_TASKS}`;
            statusBarItem.tooltip = MESSAGES.ADD_FIRST_TASK;
        } else {
            statusBarItem.text = `$(checklist) ${mustCount} Must | ${inProgressCount} In Progress`;
            
            // Construir tooltip con las estadísticas configuradas
            const tooltipParts: string[] = [];
            
            if (config.get<boolean>('showTotal', true)) {
                tooltipParts.push(`Total Tasks: ${statistics.total}`);
            }
            
            if (config.get<boolean>('showDone', true)) {
                tooltipParts.push(`Completed: ${statistics.done}`);
            }
            
            if (config.get<boolean>('showMust', true)) {
                tooltipParts.push(`Must Priority: ${statistics.must}`);
            }
            
            if (config.get<boolean>('showInProgress', true)) {
                tooltipParts.push(`In Progress: ${statistics.inProgress}`);
            }
            
            if (config.get<boolean>('showOverdue', true)) {
                tooltipParts.push(`Overdue: ${statistics.overdue}`);
            }
            
            statusBarItem.tooltip = tooltipParts.join('\n') || 'Task Statistics';
        }
        statusBarItem.show();
    };

    // Initial update - deferred to avoid race conditions with platform initialization
    setImmediate(async () => {
        const tasks = await taskService.getTasks();
        await updateStatusBar(tasks);
    });

    // Update on changes
    context.subscriptions.push(taskService.onTasksChanged(async tasks => {
        await updateStatusBar(tasks);
        provider.refresh();
    }));
    
    // Update when configuration changes
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('todo4vcode.stats')) {
            const tasks = await taskService.getTasks();
            await updateStatusBar(tasks);
        }
    }));

    context.subscriptions.push(taskService.onSettingsChanged(data => {
        if (fullScreenPanel && data.viewType === 'full') {
            taskService.getTasks().then(tasks => {
                fullScreenPanel!.webview.postMessage({ type: 'updateTasks', tasks, settings: data.settings });
            });
        }
    }));

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TaskViewProvider.viewType, provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.refresh', () => {
            provider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.openFull', () => {
            // Si ya existe un panel, revelarlo y enfocarlo
            if (fullScreenPanel) {
                fullScreenPanel.reveal(vscode.ViewColumn.One);
                return;
            }

            // Crear nuevo panel solo si no existe
            fullScreenPanel = vscode.window.createWebviewPanel(
                'todo4vcodeFull',
                'ToDo4VCode',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            fullScreenPanel.iconPath = {
                light: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg'),
                dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg')
            };

            const updatePanel = async () => {
                if (fullScreenPanel) {
                    const tasks = await taskService.getTasks();
                    fullScreenPanel.webview.html = TaskWebview.getHtml(fullScreenPanel.webview, context.extensionUri, tasks, 'full');
                }
            };

            updatePanel();

            fullScreenPanel.webview.onDidReceiveMessage(async data => {
                if (fullScreenPanel) {
                    // Asegurarse de que el mensaje incluya el viewType correcto
                    if (data.type === 'ready' || data.type === 'updateSettings') {
                        data.viewType = 'full';
                    }
                    await webviewHandler.handleMessage(data, fullScreenPanel);
                }
            });

            const taskChangeSubscription = taskService.onTasksChanged(async tasks => {
                if (fullScreenPanel) {
                    const settings = await taskService.getSettings('full');
                    fullScreenPanel.webview.postMessage({ type: 'updateTasks', tasks, settings });
                }
            });

            fullScreenPanel.onDidDispose(() => {
                taskChangeSubscription.dispose();
                fullScreenPanel = undefined; // Limpiar la referencia cuando se cierre
            });
        })
    );

    // Comando para abrir el modal de una tarea específica
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.openTaskModal', (taskId: string) => {
            if (fullScreenPanel) {
                fullScreenPanel.webview.postMessage({ type: 'openTaskModal', taskId });
            }
        })
    );

}

export function deactivate() { }
