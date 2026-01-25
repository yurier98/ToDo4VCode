import { Priority } from './task';

export interface ViewSettings {
    viewMode: 'list' | 'kanban';
    groupBy: 'status' | 'priority' | 'none';
    hideCompleted: boolean;
    sortBy: 'custom' | 'priority' | 'dueDate' | 'title';
    collapsedSections: string[];
}

export type ViewType = 'sidebar' | 'full';

export interface StatisticsConfig {
    showTotal: boolean;
    showDone: boolean;
    showMust: boolean;
    showInProgress: boolean;
    showOverdue: boolean;
}

export interface ExtensionConfig {
    hideCompleted: boolean;
    defaultPriority: Priority;
    stats: StatisticsConfig;
}
