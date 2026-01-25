import { TodoItem, Priority, Status } from './task';
import { ViewSettings, ExtensionConfig } from './settings';

export interface BaseWebviewMessage {
    type: string;
    viewType?: 'sidebar' | 'full';
}

export interface AddTaskMessage extends BaseWebviewMessage {
    type: 'addTask';
    value: {
        text: string;
        priority: Priority;
        status?: Status;
        description?: string;
        dueDate?: number;
        reminders?: number[];
    };
}

export interface UpdateStatusMessage extends BaseWebviewMessage {
    type: 'updateStatus';
    id: string;
    status: Status;
}

export interface UpdatePriorityMessage extends BaseWebviewMessage {
    type: 'updatePriority';
    id: string;
    priority: Priority;
}

export interface UpdateTaskTextMessage extends BaseWebviewMessage {
    type: 'updateTaskText';
    id: string;
    text: string;
}

export interface UpdateDescriptionMessage extends BaseWebviewMessage {
    type: 'updateDescription';
    id: string;
    description: string;
}

export interface UpdateDueDateMessage extends BaseWebviewMessage {
    type: 'updateDueDate';
    id: string;
    dueDate: number | null;
}

export interface UpdateRemindersMessage extends BaseWebviewMessage {
    type: 'updateReminders';
    id: string;
    reminders: number[];
}

export interface UpdateOrdersMessage extends BaseWebviewMessage {
    type: 'updateOrders';
    orders: { id: string; order: number }[];
}

export interface DeleteTaskMessage extends BaseWebviewMessage {
    type: 'deleteTask';
    id: string;
}

export interface AddSubtaskMessage extends BaseWebviewMessage {
    type: 'addSubtask';
    taskId: string;
    text: string;
}

export interface ToggleSubtaskMessage extends BaseWebviewMessage {
    type: 'toggleSubtask';
    taskId: string;
    subtaskId: string;
}

export interface DeleteSubtaskMessage extends BaseWebviewMessage {
    type: 'deleteSubtask';
    taskId: string;
    subtaskId: string;
}

export interface UpdateSubtaskTextMessage extends BaseWebviewMessage {
    type: 'updateSubtaskText';
    taskId: string;
    subtaskId: string;
    text: string;
}

export interface UpdateSettingsMessage extends BaseWebviewMessage {
    type: 'updateSettings';
    settings: ViewSettings;
}

export interface ReadyMessage extends BaseWebviewMessage {
    type: 'ready';
}

export interface OpenFullMessage extends BaseWebviewMessage {
    type: 'openFull';
}

export interface SendToChatMessage extends BaseWebviewMessage {
    type: 'sendToChat';
    text: string;
}

export interface OpenTaskModalMessage extends BaseWebviewMessage {
    type: 'openTaskModal';
    taskId: string;
}

export interface ConfigReadyMessage extends BaseWebviewMessage {
    type: 'configReady';
}

export interface UpdateConfigMessage extends BaseWebviewMessage {
    type: 'updateConfig';
    key: string;
    value: boolean | string;
}

export type WebviewMessage =
    | AddTaskMessage
    | UpdateStatusMessage
    | UpdatePriorityMessage
    | UpdateTaskTextMessage
    | UpdateDescriptionMessage
    | UpdateDueDateMessage
    | UpdateRemindersMessage
    | UpdateOrdersMessage
    | DeleteTaskMessage
    | AddSubtaskMessage
    | ToggleSubtaskMessage
    | DeleteSubtaskMessage
    | UpdateSubtaskTextMessage
    | UpdateSettingsMessage
    | ReadyMessage
    | OpenFullMessage
    | SendToChatMessage
    | OpenTaskModalMessage
    | ConfigReadyMessage
    | UpdateConfigMessage;

export interface WebviewResponse {
    type: 'updateTasks';
    tasks: TodoItem[];
    settings?: ViewSettings;
}

export interface ConfigDataResponse {
    type: 'configData';
    config: ExtensionConfig;
}
