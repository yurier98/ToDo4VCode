import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';
import { TaskService } from './TaskService';
import { StorageManager } from '../storage/StorageManager';
import { ConfigService } from './ConfigService';
import { TodoItem } from '../models/task';
import { ViewSettings, ExtensionConfig } from '../models/settings';
import { Logger } from '../../utils/logger';

export interface WorkspaceExportData {
    version: string;
    exportDate: string;
    format: string;
    data: {
        tasks: TodoItem[];
        viewSettings: {
            sidebar?: ViewSettings;
            full?: ViewSettings;
        };
        extensionConfig: ExtensionConfig;
    };
}

export class ImportExportService {
    private static readonly EXPORT_VERSION = '1.0.0';
    private static readonly EXPORT_FORMAT = 'todo4vcode-workspace';

    constructor(
        private readonly taskService: TaskService,
        private readonly storageManager: StorageManager
    ) {}

    public async exportWorkspaceData(): Promise<void> {
        try {
            const tasks = await this.taskService.getTasks();
            const sidebarSettings = await this.storageManager.getSettings('sidebar');
            const fullSettings = await this.storageManager.getSettings('full');
            const extensionConfig = ConfigService.getExtensionConfig();

            const exportData: WorkspaceExportData = {
                version: ImportExportService.EXPORT_VERSION,
                exportDate: new Date().toISOString(),
                format: ImportExportService.EXPORT_FORMAT,
                data: {
                    tasks,
                    viewSettings: {
                        sidebar: sidebarSettings,
                        full: fullSettings
                    },
                    extensionConfig
                }
            };

            const jsonContent = JSON.stringify(exportData, null, 2);
            const fileName = `todo4vcode-export-${new Date().toISOString().split('T')[0]}.json`;
            
            const downloadsPath = path.join(os.homedir(), 'Downloads');
            const defaultFilePath = path.join(downloadsPath, fileName);
            const defaultUri = vscode.Uri.file(defaultFilePath);

            const uri = await vscode.window.showSaveDialog({
                defaultUri: defaultUri,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                },
                saveLabel: 'Export'
            });

            if (uri) {
                await vscode.workspace.fs.writeFile(uri, Buffer.from(jsonContent, 'utf8'));
                vscode.window.showInformationMessage('Workspace data exported successfully');
                Logger.info('Workspace data exported', { file: uri.fsPath, taskCount: tasks.length });
            }
        } catch (error) {
            Logger.error('Error exporting workspace data', error);
            vscode.window.showErrorMessage('Failed to export workspace data');
            throw error;
        }
    }

    public async importWorkspaceData(): Promise<void> {
        try {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'JSON Files': ['json'],
                    'All Files': ['*']
                },
                openLabel: 'Import'
            });

            if (!uris || uris.length === 0) {
                return;
            }

            const fileUri = uris[0];
            const fileData = await vscode.workspace.fs.readFile(fileUri);
            const jsonContent = fileData.toString();
            const importData: WorkspaceExportData = JSON.parse(jsonContent);

            if (!this.validateImportData(importData)) {
                vscode.window.showErrorMessage('Invalid import file format');
                return;
            }

            const confirmMessage = `This will replace all current tasks and settings. Continue?`;
            const action = await vscode.window.showWarningMessage(
                confirmMessage,
                { modal: true },
                'No',
                'Yes'
            );

            if (action !== 'Yes') {
                return;
            }

            if (importData.data.tasks && Array.isArray(importData.data.tasks)) {
                await this.taskService.saveTasks(importData.data.tasks);
            }

            if (importData.data.viewSettings) {
                if (importData.data.viewSettings.sidebar) {
                    await this.storageManager.saveSettings('sidebar', importData.data.viewSettings.sidebar);
                }
                if (importData.data.viewSettings.full) {
                    await this.storageManager.saveSettings('full', importData.data.viewSettings.full);
                }
            }

            if (importData.data.extensionConfig) {
                await this.restoreExtensionConfig(importData.data.extensionConfig);
            }

            vscode.window.showInformationMessage('Workspace data imported successfully');
            Logger.info('Workspace data imported', { 
                file: fileUri.fsPath, 
                taskCount: importData.data.tasks?.length || 0 
            });
        } catch (error) {
            Logger.error('Error importing workspace data', error);
            vscode.window.showErrorMessage(`Failed to import workspace data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    private validateImportData(data: unknown): data is WorkspaceExportData {
        if (!data || typeof data !== 'object') {
            return false;
        }

        const d = data as Record<string, unknown>;
        
        if (d.format !== ImportExportService.EXPORT_FORMAT) {
            return false;
        }

        if (!d.data || typeof d.data !== 'object') {
            return false;
        }

        const dataObj = d.data as Record<string, unknown>;
        
        if (!Array.isArray(dataObj.tasks)) {
            return false;
        }

        return true;
    }

    public async clearAllData(): Promise<void> {
        try {
            const confirmMessage = 'This will permanently delete all tasks. This action cannot be undone. Continue?';
            const action = await vscode.window.showWarningMessage(
                confirmMessage,
                { modal: true },
                'No',
                'Yes'
            );

            if (action !== 'Yes') {
                return;
            }

            await this.taskService.clearAllTasks();
            vscode.window.showInformationMessage('All tasks have been deleted');
            Logger.info('All data cleared by user');
        } catch (error) {
            Logger.error('Error clearing all data', error);
            vscode.window.showErrorMessage(`Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    }

    private async restoreExtensionConfig(config: ExtensionConfig): Promise<void> {
        await ConfigService.updateHideCompleted(config.hideCompleted);
        await ConfigService.updateDefaultPriority(config.defaultPriority);
        
        if (config.stats) {
            await ConfigService.updateStatisticsConfig(config.stats);
        }
        
        if (config.reminders) {
            await ConfigService.updateReminderSoundEnabled(config.reminders.playSound);
        }
    }
}
