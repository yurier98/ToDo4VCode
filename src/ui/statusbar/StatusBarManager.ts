import * as vscode from 'vscode';
import { TodoItem } from '../../core/models/task';
import { TaskStatistics } from '../../core/services/StatisticsService';
import { ConfigService } from '../../core/services/ConfigService';
import { MESSAGES } from '../../constants';
import { Logger } from '../../utils/logger';

export class StatusBarManager implements vscode.Disposable {
    private readonly _statusBarItem: vscode.StatusBarItem;
    private _updateCallback?: (tasks: TodoItem[]) => Promise<void>;

    constructor() {
        this._statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    }

    public async update(tasks: TodoItem[], statistics: TaskStatistics): Promise<void> {
        try {
            const total = tasks.length;
            const mustCount = tasks.filter(t => t.priority === 'Must' && t.status !== 'Done').length;
            const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;

            const config = ConfigService.getStatisticsConfig();

            if (total === 0) {
                this._statusBarItem.text = `$(checklist) ${MESSAGES.NO_TASKS}`;
                this._statusBarItem.tooltip = MESSAGES.ADD_FIRST_TASK;
            } else {
                this._statusBarItem.text = `$(checklist) ${mustCount} Must | ${inProgressCount} In Progress`;

                const tooltipParts: string[] = [];

                if (config.showTotal) {
                    tooltipParts.push(`Total Tasks: ${statistics.total}`);
                }

                if (config.showDone) {
                    tooltipParts.push(`Completed: ${statistics.done}`);
                }

                if (config.showMust) {
                    tooltipParts.push(`Must Priority: ${statistics.must}`);
                }

                if (config.showInProgress) {
                    tooltipParts.push(`In Progress: ${statistics.inProgress}`);
                }

                if (config.showOverdue) {
                    tooltipParts.push(`Overdue: ${statistics.overdue}`);
                }

                this._statusBarItem.tooltip = tooltipParts.join('\n') || 'Task Statistics';
            }
            this._statusBarItem.show();
        } catch (error) {
            Logger.error('Error updating status bar', error);
        }
    }

    public show(): void {
        this._statusBarItem.show();
    }

    public hide(): void {
        this._statusBarItem.hide();
    }

    public dispose(): void {
        this._statusBarItem.dispose();
    }
}
