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

    // Create Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'todo4vcode-view.focus';
    context.subscriptions.push(statusBarItem);

    const updateStatusBar = (tasks: TodoItem[]) => {
        const total = tasks.length;
        const mustCount = tasks.filter(t => t.priority === 'Must' && t.status !== 'Done').length;
        const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;

        if (total === 0) {
            statusBarItem.text = `$(checklist) ${MESSAGES.NO_TASKS}`;
            statusBarItem.tooltip = MESSAGES.ADD_FIRST_TASK;
        } else {
            statusBarItem.text = `$(checklist) ${mustCount} Must | ${inProgressCount} In Progress`;
            statusBarItem.tooltip = MESSAGES.TASKS_PENDING.replace('{0}', mustCount.toString()) +
                '\n' + MESSAGES.TASKS_IN_PROGRESS.replace('{1}', inProgressCount.toString()) +
                '\n' + MESSAGES.TOTAL_TASKS.replace('{2}', total.toString());
        }
        statusBarItem.show();
    };

    // Initial update - deferred to avoid race conditions with platform initialization
    setImmediate(() => {
        taskService.getTasks().then(updateStatusBar);
    });

    // Update on changes
    context.subscriptions.push(taskService.onTasksChanged(tasks => {
        updateStatusBar(tasks);
        provider.refresh();
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
            const panel = vscode.window.createWebviewPanel(
                'todo4vcodeFull',
                'ToDo4VCode',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [context.extensionUri],
                    retainContextWhenHidden: true
                }
            );

            panel.iconPath = {
                light: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg'),
                dark: vscode.Uri.joinPath(context.extensionUri, 'media', 'icon.svg')
            };

            const updatePanel = async () => {
                const tasks = await taskService.getTasks();
                panel.webview.html = TaskWebview.getHtml(panel.webview, context.extensionUri, tasks);
            };

            updatePanel();

            panel.webview.onDidReceiveMessage(async data => {
                await webviewHandler.handleMessage(data, panel);
            });

            const taskChangeSubscription = taskService.onTasksChanged(tasks => {
                panel.webview.postMessage({ type: 'updateTasks', tasks });
            });

            panel.onDidDispose(() => {
                taskChangeSubscription.dispose();
            });
        })
    );
}

export function deactivate() { }
