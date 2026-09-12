import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { TaskService } from '../../core/services/TaskService';
import { StorageManager } from '../../core/storage/StorageManager';
import { createTestExtensionContext } from './testUtils';

function createFixture(): { taskService: TaskService; storageManager: StorageManager } {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();
    const context = createTestExtensionContext();
    const storageManager = new StorageManager(context);
    const taskService = new TaskService(storageManager);
    return { taskService, storageManager };
}

test('concurrent mutations on the same task are serialized so no update is lost', async () => {
    const { taskService, storageManager } = createFixture();
    await taskService.saveTasks([
        { id: 'a', text: 'A', priority: 'Should', status: 'Todo', completed: false, createdAt: 1, order: 1000 }
    ]);

    await Promise.all([
        taskService.updateStatus('a', 'Done'),
        taskService.updateTaskText('a', 'Renamed'),
        taskService.updatePriority('a', 'Must'),
        taskService.updateOrders([{ id: 'a', order: 2500 }])
    ]);

    const [task] = await taskService.getTasks();
    assert.equal(task.status, 'Done');
    assert.equal(task.text, 'Renamed');
    assert.equal(task.priority, 'Must');
    assert.equal(task.order, 2500);

    taskService.dispose();
    storageManager.dispose();
});

test('concurrent createTask and deleteTask keep the task list consistent', async () => {
    const { taskService, storageManager } = createFixture();
    await taskService.saveTasks([
        { id: 'a', text: 'A', priority: 'Should', status: 'Todo', completed: false, createdAt: 1, order: 1000 }
    ]);

    const [created] = await Promise.all([
        taskService.createTask({ text: 'B', priority: 'Could' }),
        taskService.deleteTask('a')
    ]);

    const tasks = await taskService.getTasks();
    assert.deepEqual(tasks.map((t) => t.id), [created.id]);

    taskService.dispose();
    storageManager.dispose();
});
