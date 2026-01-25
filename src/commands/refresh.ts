import * as vscode from 'vscode';
import { TaskViewProvider } from '../ui/providers/TaskViewProvider';

export function registerRefreshCommand(
    context: vscode.ExtensionContext,
    provider: TaskViewProvider
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.refresh', () => {
            provider.refresh();
        })
    );
}
