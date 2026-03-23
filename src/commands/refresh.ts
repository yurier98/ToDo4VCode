import * as vscode from 'vscode';
import { ConfigService } from '../core/services/ConfigService';
import { TaskService } from '../core/services/TaskService';
import { TaskViewProvider } from '../ui/providers/TaskViewProvider';
import { Logger } from '../utils/logger';

export function registerRefreshCommand(
    context: vscode.ExtensionContext,
    provider: TaskViewProvider,
    taskService: TaskService
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.refresh', async () => {
            try {
                if (ConfigService.isCommentScanEnabled()) {
                    await taskService.importCommentTasksFromWorkspace();
                }
                await provider.refresh();
            } catch (error) {
                Logger.error('Error running refresh command', error);
            }
        })
    );
}
