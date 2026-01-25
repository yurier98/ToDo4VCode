import * as vscode from 'vscode';
import { ConfigPanel } from '../ui/panels/ConfigPanel';

export function registerOpenConfigCommand(
    context: vscode.ExtensionContext,
    configPanel: ConfigPanel
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.openConfig', () => {
            configPanel.reveal();
        })
    );
}
