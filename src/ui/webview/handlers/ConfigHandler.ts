import * as vscode from 'vscode';
import { ConfigService } from '../../../core/services/ConfigService';
import { Priority } from '../../../core/models/task';
import { StatisticsConfig } from '../../../core/models/settings';
import { ConfigReadyMessage, UpdateConfigMessage } from '../../../core/models/webview-messages';
import { BaseHandler } from './BaseHandler';
import { Logger } from '../../../utils/logger';

export class ConfigHandler extends BaseHandler {
    protected async handle(message: unknown, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        const targetWebview = 'webview' in webview ? webview.webview : webview;

        if (!this._isConfigMessage(message)) {
            Logger.warn('ConfigHandler received invalid message', message);
            return;
        }

        switch (message.type) {
            case 'configReady':
                await this._sendConfigData(targetWebview);
                break;
            case 'updateConfig':
                await this._updateConfig(message.key, message.value);
                await this._sendConfigData(targetWebview);
                break;
            default:
                Logger.warn(`ConfigHandler received unhandled message type: ${(message as ConfigReadyMessage | UpdateConfigMessage).type}`);
        }
    }

    private _isConfigMessage(message: unknown): message is ConfigReadyMessage | UpdateConfigMessage {
        return (
            typeof message === 'object' &&
            message !== null &&
            'type' in message &&
            (message.type === 'configReady' || message.type === 'updateConfig')
        );
    }

    private async _sendConfigData(webview: vscode.Webview): Promise<void> {
        try {
            const config = ConfigService.getExtensionConfig();
            webview.postMessage({ type: 'configData', config });
        } catch (error) {
            Logger.error('Error sending config data', error);
        }
    }

    private async _updateConfig(key: string, value: boolean | string): Promise<void> {
        try {
            if (key === 'hideCompleted') {
                await ConfigService.updateHideCompleted(value as boolean);
            } else if (key === 'defaultPriority') {
                await ConfigService.updateDefaultPriority(value as Priority);
            } else if (key.startsWith('stats.')) {
                const statsKey = key.replace('stats.', '') as keyof StatisticsConfig;
                await ConfigService.updateStatisticsConfig({ [statsKey]: value as boolean });
            } else if (key === 'reminders.playSound') {
                await ConfigService.updateReminderSoundEnabled(value as boolean);
            } else {
                Logger.warn(`Unknown config key: ${key}`);
            }
        } catch (error) {
            Logger.error(`Error updating config key: ${key}`, error);
            throw error;
        }
    }
}
