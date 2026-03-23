export type Priority = 'Must' | 'Should' | 'Could' | 'Wont';
export type Status = 'Todo' | 'Ready' | 'In Progress' | 'Testing' | 'Done';
export type CommentMarker = 'TODO' | 'FIXME' | 'NOTE';

export interface CommentScanSource {
    type: 'comment-scan';
    file: string;
    line: number;
    marker: CommentMarker;
}

export interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

export interface TodoItem {
    id: string;
    text: string;
    description?: string;
    tags?: string[];
    priority: Priority;
    status: Status;
    dueDate?: number;
    reminders?: number[];
    completed: boolean;
    createdAt: number;
    order?: number;
    subtasks?: SubTask[];
    source?: CommentScanSource;
}
