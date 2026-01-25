import * as vscode from 'vscode';
import { FullScreenPanel } from '../ui/panels/FullScreenPanel';

export function registerOpenTaskModalCommand(
    context: vscode.ExtensionContext,
    fullScreenPanel: FullScreenPanel
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.openTaskModal', (taskId: string) => {
            if (typeof taskId === 'string') {
                fullScreenPanel.openTaskModal(taskId);
            }
        })
    );
}
