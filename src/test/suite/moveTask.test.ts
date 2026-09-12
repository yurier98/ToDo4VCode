import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import * as vscode from 'vscode';
import { TaskService } from '../../core/services/TaskService';
import { StorageManager } from '../../core/storage/StorageManager';
import { MessageValidator } from '../../utils/validators';
import { createTestExtensionContext } from './testUtils';

function createFixture(): { taskService: TaskService; storageManager: StorageManager } {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();
    const context = createTestExtensionContext();
    const storageManager = new StorageManager(context);
    const taskService = new TaskService(storageManager);
    return { taskService, storageManager };
}

test('MessageValidator accepts a moveTask message with status, priority and orders', () => {
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a', status: 'Done' }), true);
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a', priority: 'Wont' }), true);
    assert.equal(
        MessageValidator.validate({ type: 'moveTask', id: 'a', orders: [{ id: 'a', order: 1500 }] }),
        true
    );
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a' }), true);
});

test('MessageValidator rejects malformed moveTask messages', () => {
    assert.equal(MessageValidator.validate({ type: 'moveTask', status: 'Done' }), false);
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a', priority: "Won't" }), false);
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a', status: 'Later' }), false);
    assert.equal(MessageValidator.validate({ type: 'moveTask', id: 'a', orders: [{ id: 'a' }] }), false);
});

test('TaskService.moveTask applies status, priority and orders in a single save', async () => {
    const { taskService, storageManager } = createFixture();
    await taskService.saveTasks([
        { id: 'a', text: 'A', priority: 'Should', status: 'Todo', completed: false, createdAt: 1, order: 1000 },
        { id: 'b', text: 'B', priority: 'Must', status: 'Done', completed: true, createdAt: 2, order: 2000 }
    ]);

    let notifications = 0;
    const subscription = taskService.onTasksChanged(() => { notifications += 1; });

    await taskService.moveTask('a', {
        status: 'Done',
        priority: 'Wont',
        orders: [{ id: 'a', order: 2500 }, { id: 'b', order: 1500 }]
    });

    const tasks = await taskService.getTasks();
    const a = tasks.find((t) => t.id === 'a');
    const b = tasks.find((t) => t.id === 'b');

    assert.equal(a?.status, 'Done');
    assert.equal(a?.completed, true);
    assert.equal(a?.priority, 'Wont');
    assert.equal(a?.order, 2500);
    assert.equal(b?.order, 1500);
    assert.equal(b?.status, 'Done');
    assert.equal(notifications, 1);

    subscription.dispose();
    taskService.dispose();
    storageManager.dispose();
});

test('TaskService.moveTask with only a status change keeps priority and order untouched', async () => {
    const { taskService, storageManager } = createFixture();
    await taskService.saveTasks([
        { id: 'a', text: 'A', priority: 'Could', status: 'Todo', completed: false, createdAt: 1, order: 1000 }
    ]);

    await taskService.moveTask('a', { status: 'In Progress' });

    const tasks = await taskService.getTasks();
    assert.equal(tasks[0].status, 'In Progress');
    assert.equal(tasks[0].completed, false);
    assert.equal(tasks[0].priority, 'Could');
    assert.equal(tasks[0].order, 1000);

    taskService.dispose();
    storageManager.dispose();
});
