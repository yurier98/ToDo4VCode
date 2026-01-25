import { TodoItem } from '../models/task';

export interface TaskStatistics {
    total: number;
    done: number;
    must: number;
    inProgress: number;
    overdue: number;
}

export class StatisticsService {
    public static calculateStatistics(tasks: TodoItem[]): TaskStatistics {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayTimestamp = today.getTime();

        return {
            total: tasks.length,
            done: tasks.filter(t => t.status === 'Done').length,
            must: tasks.filter(t => t.priority === 'Must').length,
            inProgress: tasks.filter(t => t.status === 'In Progress').length,
            overdue: tasks.filter(t => {
                if (!t.dueDate || t.status === 'Done') return false;
                const dueDate = new Date(t.dueDate);
                dueDate.setHours(0, 0, 0, 0);
                return dueDate.getTime() < todayTimestamp;
            }).length
        };
    }
}
