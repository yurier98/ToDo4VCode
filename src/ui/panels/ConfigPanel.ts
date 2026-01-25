import * as vscode from 'vscode';
import { ConfigWebview } from '../webview/ConfigWebview';
import { ConfigHandler } from '../webview/handlers/ConfigHandler';
import { Logger } from '../../utils/logger';
import { MEDIA_PATHS } from '../../core/constants/media-paths';

export class ConfigPanel implements vscode.Disposable {
    private _panel: vscode.WebviewPanel | undefined;
    private readonly _configHandler: ConfigHandler;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._configHandler = new ConfigHandler();
    }

    public async reveal(): Promise<void> {
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        await this._createPanel();
    }

    private async _createPanel(): Promise<void> {
        try {
            this._panel = vscode.window.createWebviewPanel(
                'todo4vcodeConfig',
                'ToDo4VCode Settings',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [this._extensionUri],
                    retainContextWhenHidden: true
                }
            );

            this._panel.iconPath = {
                light: vscode.Uri.joinPath(this._extensionUri, MEDIA_PATHS.ICON),
                dark: vscode.Uri.joinPath(this._extensionUri, MEDIA_PATHS.ICON)
            };

            await this._updatePanel();

            this._panel.webview.onDidReceiveMessage(async (data) => {
                if (this._panel) {
                    await this._configHandler.process(data, this._panel);
                }
            });

            this._panel.onDidDispose(() => {
                this._panel = undefined;
            });
        } catch (error) {
            Logger.error('Error creating config panel', error);
        }
    }

    private async _updatePanel(): Promise<void> {
        if (this._panel) {
            this._panel.webview.html = ConfigWebview.getHtml(this._panel.webview, this._extensionUri);
        }
    }

    public dispose(): void {
        this._panel?.dispose();
        this._panel = undefined;
    }
}
