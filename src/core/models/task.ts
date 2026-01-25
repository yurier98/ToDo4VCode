export type Priority = 'Must' | 'Should' | 'Could' | 'Wont';
export type Status = 'Todo' | 'Ready' | 'In Progress' | 'Testing' | 'Done';

export interface SubTask {
    id: string;
    text: string;
    completed: boolean;
}

export interface TodoItem {
    id: string;
    text: string;
    description?: string;
    priority: Priority;
    status: Status;
    dueDate?: number;
    reminders?: number[];
    completed: boolean;
    createdAt: number;
    order?: number;
    subtasks?: SubTask[];
}
