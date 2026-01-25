import * as vscode from 'vscode';
import { StorageManager } from './core/storage/StorageManager';
import { TaskService } from './core/services/TaskService';
import { ConfigService } from './core/services/ConfigService';
import { StatisticsService } from './core/services/StatisticsService';
import { TaskViewProvider } from './ui/providers/TaskViewProvider';
import { FullScreenPanel } from './ui/panels/FullScreenPanel';
import { ConfigPanel } from './ui/panels/ConfigPanel';
import { StatusBarManager } from './ui/statusbar/StatusBarManager';
import { Logger } from './utils/logger';
import { registerRefreshCommand, registerOpenFullCommand, registerOpenTaskModalCommand, registerOpenConfigCommand } from './commands';

export function activate(context: vscode.ExtensionContext): void {
    Logger.initialize();

    const storageManager = new StorageManager(context);
    const taskService = new TaskService(storageManager);
    const statusBarManager = new StatusBarManager();
    const fullScreenPanel = new FullScreenPanel(context.extensionUri, taskService, storageManager);
    const configPanel = new ConfigPanel(context.extensionUri, taskService, storageManager);
    const provider = new TaskViewProvider(context.extensionUri, taskService, storageManager);

    context.subscriptions.push(taskService);
    context.subscriptions.push(statusBarManager);
    context.subscriptions.push(fullScreenPanel);
    context.subscriptions.push(configPanel);

    const updateStatusBar = async (): Promise<void> => {
        try {
            const tasks = await taskService.getTasks();
            const statistics = await taskService.getStatistics();
            await statusBarManager.update(tasks, statistics);
        } catch (error) {
            Logger.error('Error updating status bar', error);
        }
    };

    setImmediate(async () => {
        await updateStatusBar();
    });

    context.subscriptions.push(
        taskService.onTasksChanged(async () => {
            await updateStatusBar();
            provider.refresh();
        })
    );

    context.subscriptions.push(
        ConfigService.onConfigurationChanged(async (e) => {
            if (ConfigService.affectsStatisticsConfig(e)) {
                await updateStatusBar();
            }
        })
    );

    context.subscriptions.push(
        taskService.onSettingsChanged((data) => {
            if (data.viewType === 'full') {
                taskService
                    .getTasks()
                    .then((tasks) => {
                        // Settings changed, webview will be updated by FullScreenPanel
                    })
                    .catch((error) => {
                        Logger.error('Error handling settings change', error);
                    });
            }
        })
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(TaskViewProvider.viewType, provider)
    );

    registerRefreshCommand(context, provider);
    registerOpenFullCommand(context, fullScreenPanel);
    registerOpenTaskModalCommand(context, fullScreenPanel);
    registerOpenConfigCommand(context, configPanel);
}

export function deactivate(): void {
    Logger.info('ToDo4VCode extension deactivated');
}
