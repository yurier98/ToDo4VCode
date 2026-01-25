import * as vscode from 'vscode';
import { ViewSettings, StatisticsConfig, ExtensionConfig } from '../models/settings';
import { Priority } from '../models/task';
import { Logger } from '../../utils/logger';

export class ConfigService {
    private static readonly CONFIG_SECTION = 'todo4vcode';

    public static getExtensionConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        
        return {
            hideCompleted: config.get<boolean>('hideCompleted', false),
            defaultPriority: config.get<Priority>('defaultPriority', 'Should'),
            stats: ConfigService.getStatisticsConfig()
        };
    }

    public static getStatisticsConfig(): StatisticsConfig {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.stats`);
        
        return {
            showTotal: config.get<boolean>('showTotal', true),
            showDone: config.get<boolean>('showDone', true),
            showMust: config.get<boolean>('showMust', true),
            showInProgress: config.get<boolean>('showInProgress', true),
            showOverdue: config.get<boolean>('showOverdue', true)
        };
    }

    public static getDefaultViewSettings(): ViewSettings {
        return {
            viewMode: 'list',
            groupBy: 'status',
            hideCompleted: false,
            sortBy: 'priority',
            collapsedSections: []
        };
    }

    public static onConfigurationChanged(
        callback: (e: vscode.ConfigurationChangeEvent) => void
    ): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(ConfigService.CONFIG_SECTION)) {
                Logger.debug('Configuration changed', { section: ConfigService.CONFIG_SECTION });
                callback(e);
            }
        });
    }

    public static affectsStatisticsConfig(e: vscode.ConfigurationChangeEvent): boolean {
        return e.affectsConfiguration(`${ConfigService.CONFIG_SECTION}.stats`);
    }
}
