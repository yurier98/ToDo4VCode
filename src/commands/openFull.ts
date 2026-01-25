import * as vscode from 'vscode';
import { FullScreenPanel } from '../ui/panels/FullScreenPanel';

export function registerOpenFullCommand(
    context: vscode.ExtensionContext,
    fullScreenPanel: FullScreenPanel
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.openFull', () => {
            fullScreenPanel.reveal();
        })
    );
}
