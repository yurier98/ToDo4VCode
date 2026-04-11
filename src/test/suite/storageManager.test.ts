import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import { StorageManager } from '../../core/storage/StorageManager';
import { createTestExtensionContext } from './testUtils';
import * as vscode from 'vscode';

test('StorageManager saves and reads tasks from local memento store', async () => {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();

    const context = createTestExtensionContext();
    const storageManager = new StorageManager(context);

    await storageManager.saveTasks([
        {
            id: 'task-1',
            text: 'Task One',
            priority: 'Should',
            status: 'Todo',
            completed: false,
            createdAt: Date.now()
        }
    ]);

    const tasks = await storageManager.getTasks();
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].text, 'Task One');

    storageManager.dispose();
});

test('StorageManager saves and reads sidebar/full settings independently', async () => {
    const mockVscode = vscode as unknown as { resetMockConfiguration?: () => void };
    mockVscode.resetMockConfiguration?.();

    const context = createTestExtensionContext();
    const storageManager = new StorageManager(context);

    const sidebarSettings = {
        viewMode: 'list' as const,
        groupBy: 'status' as const,
        hideCompleted: true,
        sortBy: 'priority' as const,
        collapsedSections: ['Done']
    };
    const fullSettings = {
        viewMode: 'kanban' as const,
        groupBy: 'none' as const,
        hideCompleted: false,
        sortBy: 'custom' as const,
        collapsedSections: []
    };

    await storageManager.saveSettings('sidebar', sidebarSettings);
    await storageManager.saveSettings('full', fullSettings);

    const sidebarLoaded = await storageManager.getSettings('sidebar');
    const fullLoaded = await storageManager.getSettings('full');

    assert.deepEqual(sidebarLoaded, sidebarSettings);
    assert.deepEqual(fullLoaded, fullSettings);

    storageManager.dispose();
});
