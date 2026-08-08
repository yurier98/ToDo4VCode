import * as vscode from 'vscode';
import { ViewSettings, StatisticsConfig, ExtensionConfig, CommentScanConfig, SharedTasksConfig } from '../models/settings';
import { Priority } from '../models/task';
import { Logger } from '../../utils/logger';

export class ConfigService {
    private static readonly CONFIG_SECTION = 'todo4vcode';
    private static readonly DEFAULT_SHARED_TASKS_PATH = '.todo4vcode/shared-tasks.json';

    public static readonly DEFAULT_COMMENT_SCAN_EXCLUDE: string[] = [
        'node_modules', '.git', '.hg', '.svn',
        '.next', '.nuxt', '.output', '.svelte-kit', '.angular', '.expo', '.astro',
        '.vitepress', '.docusaurus', '.parcel-cache', 'storybook-static',
        'dist', 'build', 'out', 'coverage', '.vscode-test',
        'vendor', '__pycache__', '.mypy_cache', '.pytest_cache', '.tox', '.eggs', '.nox',
        '.venv', 'venv', 'env', 'site-packages', '__pypackages__', '.ruff_cache', '.pyre', 'htmlcov',
        'target', 'bin', 'obj', 'Pods',
        '.gradle', '.dart_tool', '.flutter', '.pub-cache',
        '.terraform',
        'bower_components', '.cache', 'tmp', '.turbo', '.vercel'
    ];

    public static getExtensionConfig(): ExtensionConfig {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        
        return {
            hideCompleted: config.get<boolean>('hideCompleted', false),
            defaultPriority: config.get<Priority>('defaultPriority', 'Should'),
            stats: ConfigService.getStatisticsConfig(),
            reminders: ConfigService.getRemindersConfig(),
            commentScan: ConfigService.getCommentScanConfig(),
            sharedTasks: ConfigService.getSharedTasksConfig()
        };
    }

    public static getRemindersConfig(): { playSound: boolean } {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.reminders`);
        
        return {
            playSound: config.get<boolean>('playSound', true)
        };
    }

    public static getReminderSoundEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.reminders`);
        return config.get<boolean>('playSound', true);
    }

    public static getCommentScanConfig(): CommentScanConfig {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        return {
            enabled: config.get<boolean>('enabled', true),
            exclude: config.get<string[]>('exclude', ConfigService.DEFAULT_COMMENT_SCAN_EXCLUDE)
        };
    }

    public static getSharedTasksConfig(): SharedTasksConfig {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.sharedTasks`);
        return {
            enabled: config.get<boolean>('enabled', false),
            path: config.get<string>('path', ConfigService.DEFAULT_SHARED_TASKS_PATH)
        };
    }

    public static isCommentScanEnabled(): boolean {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        return config.get<boolean>('enabled', true);
    }

    public static getCommentScanExclude(): string[] {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        return config.get<string[]>('exclude', ConfigService.DEFAULT_COMMENT_SCAN_EXCLUDE);
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
            collapsedSections: [],
            searchQuery: '',
            activeTagFilters: []
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

    public static affectsCommentScanConfig(e: vscode.ConfigurationChangeEvent): boolean {
        return e.affectsConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
    }

    public static affectsSharedTasksConfig(e: vscode.ConfigurationChangeEvent): boolean {
        return e.affectsConfiguration(`${ConfigService.CONFIG_SECTION}.sharedTasks`);
    }

    public static async updateHideCompleted(value: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        await config.update('hideCompleted', value, vscode.ConfigurationTarget.Global);
        Logger.debug('Updated hideCompleted', { value });
    }

    public static async updateDefaultPriority(value: Priority): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        await config.update('defaultPriority', value, vscode.ConfigurationTarget.Global);
        Logger.debug('Updated defaultPriority', { value });
    }

    public static async updateStatisticsConfig(updates: Partial<StatisticsConfig>): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.stats`);
        for (const [key, value] of Object.entries(updates)) {
            await config.update(key, value, vscode.ConfigurationTarget.Global);
        }
        Logger.debug('Updated statistics config', updates);
    }

    public static async updateReminderSoundEnabled(value: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.reminders`);
        await config.update('playSound', value, vscode.ConfigurationTarget.Global);
        Logger.debug('Updated reminder sound enabled', { value });
    }

    public static async updateCommentScanEnabled(value: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        await config.update('enabled', value, vscode.ConfigurationTarget.Global);
        Logger.debug('Updated comment scan enabled', { value });
    }

    public static async updateCommentScanExclude(value: string[]): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        // The `exclude` setting is scoped to `resource`, so it must be written
        // at workspace scope (same approach as updateSharedTasksPath).
        await config.update('exclude', value, vscode.ConfigurationTarget.Workspace);
        Logger.debug('Updated comment scan exclude', { value });
    }

    public static async updateSharedTasksEnabled(value: boolean): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.sharedTasks`);
        await config.update('enabled', value, vscode.ConfigurationTarget.Workspace);
        Logger.debug('Updated shared tasks enabled', { value });
    }

    public static async updateSharedTasksPath(value: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.sharedTasks`);
        await config.update('path', value, vscode.ConfigurationTarget.Workspace);
        Logger.debug('Updated shared tasks path', { value });
    }

    public static async resetToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration(ConfigService.CONFIG_SECTION);
        await config.update('hideCompleted', undefined, vscode.ConfigurationTarget.Global);
        await config.update('defaultPriority', undefined, vscode.ConfigurationTarget.Global);
        
        const statsConfig = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.stats`);
        await statsConfig.update('showTotal', undefined, vscode.ConfigurationTarget.Global);
        await statsConfig.update('showDone', undefined, vscode.ConfigurationTarget.Global);
        await statsConfig.update('showMust', undefined, vscode.ConfigurationTarget.Global);
        await statsConfig.update('showInProgress', undefined, vscode.ConfigurationTarget.Global);
        await statsConfig.update('showOverdue', undefined, vscode.ConfigurationTarget.Global);
        
        const remindersConfig = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.reminders`);
        await remindersConfig.update('playSound', undefined, vscode.ConfigurationTarget.Global);

        const commentScanConfig = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.commentScan`);
        await commentScanConfig.update('enabled', undefined, vscode.ConfigurationTarget.Global);
        await commentScanConfig.update('exclude', undefined, vscode.ConfigurationTarget.Global);

        const sharedTasksConfig = vscode.workspace.getConfiguration(`${ConfigService.CONFIG_SECTION}.sharedTasks`);
        await sharedTasksConfig.update('enabled', undefined, vscode.ConfigurationTarget.Workspace);
        await sharedTasksConfig.update('path', undefined, vscode.ConfigurationTarget.Workspace);
        
        Logger.info('Configuration reset to defaults');
    }
}
