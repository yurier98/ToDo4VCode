import * as vscode from 'vscode';
import { SendToChatMessage, WebviewMessage } from '../../../core/models/webview-messages';
import { BaseHandler } from './BaseHandler';
import { Logger } from '../../../utils/logger';

export class ChatHandler extends BaseHandler {
    protected async handle(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        if (message.type !== 'sendToChat') {
            Logger.warn(`ChatHandler received wrong message type: ${message.type}`);
            return;
        }

        const chatMessage = message as SendToChatMessage;
        const prompt = `Implement ${chatMessage.text}`;

        await vscode.env.clipboard.writeText(prompt);

        try {
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: prompt,
                isPartialQuery: true
            });
        } catch (e) {
            Logger.debug('Chat command not available', e);
        }

        vscode.window.showInformationMessage(`Task prompt copied to clipboard! Paste (Cmd+V) it into your AI chat.`);
    }
}
