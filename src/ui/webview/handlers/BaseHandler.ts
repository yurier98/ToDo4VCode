import * as vscode from 'vscode';
import { WebviewMessage } from '../../../core/models/webview-messages';
import { Logger } from '../../../utils/logger';

export abstract class BaseHandler {
    protected abstract handle(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void>;

    public async process(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        try {
            await this.handle(message, webview);
        } catch (error) {
            Logger.error(`Error handling message type: ${message.type}`, error);
            throw error;
        }
    }
}
