import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { TaskService } from '../../core/services/TaskService';
import { StorageManager } from '../../core/storage/StorageManager';
import { createTestExtensionContext } from './testUtils';
import * as vscode from 'vscode';

function createTaskServiceFixture(): { taskService: TaskService; storageManager: StorageManager } {
    const context = createTestExtensionContext();
    const storageManager = new StorageManager(context);
    const taskService = new TaskService(storageManager);
    return { taskService, storageManager };
}

test('TaskService.addTask normalizes tags and default fields', async () => {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();

    const { taskService, storageManager } = createTaskServiceFixture();

    await taskService.addTask({
        text: 'Implement tests',
        priority: 'Should',
        tags: ['#backend', 'Backend', ' qa ', '']
    });

    const tasks = await taskService.getTasks();
    assert.equal(tasks.length, 1);
    assert.deepEqual(tasks[0].tags, ['backend', 'qa']);
    assert.equal(tasks[0].status, 'Todo');
    assert.equal(tasks[0].completed, false);
    assert.equal(tasks[0].order, 1000);

    taskService.dispose();
    storageManager.dispose();
});

test('TaskService.createTask returns created task and persists it', async () => {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();

    const { taskService, storageManager } = createTaskServiceFixture();

    const createdTask = await taskService.createTask({
        text: 'Shared task',
        priority: 'Must',
        status: 'Ready',
        tags: ['collab']
    });

    const persistedTasks = await taskService.getTasks();
    const persistedTask = persistedTasks.find((task) => task.id === createdTask.id);

    assert.ok(createdTask.id);
    assert.ok(persistedTask);
    assert.equal(persistedTask?.text, 'Shared task');
    assert.equal(persistedTask?.priority, 'Must');
    assert.equal(persistedTask?.status, 'Ready');

    taskService.dispose();
    storageManager.dispose();
});

test('TaskService.updateTags deduplicates tags case-insensitively', async () => {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();

    const { taskService, storageManager } = createTaskServiceFixture();

    const createdTask = await taskService.createTask({
        text: 'Tag normalization',
        priority: 'Could',
        tags: ['Alpha']
    });

    await taskService.updateTags(createdTask.id, ['alpha', 'Beta', '#beta', ' Gamma ']);

    const tasks = await taskService.getTasks();
    const updatedTask = tasks.find((task) => task.id === createdTask.id);

    assert.ok(updatedTask);
    assert.deepEqual(updatedTask?.tags, ['alpha', 'Beta', 'Gamma']);

    taskService.dispose();
    storageManager.dispose();
});
