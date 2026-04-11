import * as vscode from 'vscode';
import { TaskService } from '../core/services/TaskService';
import { ConfigService } from '../core/services/ConfigService';
import { TaskViewProvider } from '../ui/providers/TaskViewProvider';
import { TodoItem } from '../core/models/task';
import { Logger } from '../utils/logger';

interface SelectedCodeContext {
    codeTag: string;
}

export function registerAddSelectionAsTaskCommand(
    context: vscode.ExtensionContext,
    taskService: TaskService,
    provider: TaskViewProvider
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.addSelectionAsTask', async () => {
            try {
                const selectedCodeContext = getSelectedCodeContext();
                if (!selectedCodeContext) {
                    return;
                }

                const defaultPriority = ConfigService.getExtensionConfig().defaultPriority;
                const newTask = await taskService.createTask({
                    text: 'New task...',
                    description: '',
                    priority: defaultPriority,
                    status: 'Todo',
                    tags: [selectedCodeContext.codeTag]
                });

                await revealSidebarAndOpenTaskModal(provider, newTask.id);
            } catch (error) {
                Logger.error('Error creating task from selected code', error);
                vscode.window.showErrorMessage('Could not create a task from the selected code.');
            }
        })
    );
}

export function registerAttachSelectionToTaskCommand(
    context: vscode.ExtensionContext,
    taskService: TaskService,
    provider: TaskViewProvider
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand('todo4vcode.attachSelectionToTask', async () => {
            try {
                const selectedCodeContext = getSelectedCodeContext();
                if (!selectedCodeContext) {
                    return;
                }

                const tasks = await taskService.getTasks();
                if (tasks.length === 0) {
                    vscode.window.showInformationMessage('No tasks available to attach code. Create one first.');
                    return;
                }

                const selectedTask = await pickTask(tasks);
                if (!selectedTask) {
                    return;
                }

                const mergedTags = [...(selectedTask.tags || []), selectedCodeContext.codeTag];
                await taskService.updateTags(selectedTask.id, mergedTags);
                await revealSidebarAndOpenTaskModal(provider, selectedTask.id);
            } catch (error) {
                Logger.error('Error attaching selected code to task', error);
                vscode.window.showErrorMessage('Could not attach the selected code to the task.');
            }
        })
    );
}

function getSelectedCodeContext(): SelectedCodeContext | undefined {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
        vscode.window.showWarningMessage('Open a file and select code to continue.');
        return undefined;
    }

    const { selection, document } = activeEditor;
    if (selection.isEmpty) {
        vscode.window.showWarningMessage('Select a code snippet before running this action.');
        return undefined;
    }

    if (document.uri.scheme !== 'file') {
        vscode.window.showWarningMessage('Only local workspace files are supported for code tagging.');
        return undefined;
    }

    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
        vscode.window.showWarningMessage('The selected file must be inside an open workspace folder.');
        return undefined;
    }

    const relativePath = vscode.workspace.asRelativePath(document.uri, false);
    if (!relativePath || relativePath.startsWith('..')) {
        vscode.window.showWarningMessage('Could not resolve a workspace-relative path for this file.');
        return undefined;
    }

    const codeTag = buildCodeTag(document, selection, relativePath);
    return { codeTag };
}

function buildCodeTag(document: vscode.TextDocument, selection: vscode.Selection, relativePath: string): string {
    const startLine = selection.start.line + 1;
    const startColumn = selection.start.character + 1;
    const normalizedEnd = normalizeSelectionEnd(document, selection);
    const endLine = normalizedEnd.line + 1;
    const endColumn = normalizedEnd.character + 1;

    if (startLine !== endLine) {
        return `${relativePath}:${startLine}-${endLine}`;
    }

    if (startColumn !== endColumn) {
        return `${relativePath}:${startLine}:${startColumn}-${endLine}:${endColumn}`;
    }

    return `${relativePath}:${startLine}:${startColumn}`;
}

function normalizeSelectionEnd(document: vscode.TextDocument, selection: vscode.Selection): vscode.Position {
    const end = selection.end;
    if (end.character === 0 && end.line > selection.start.line) {
        const previousLine = end.line - 1;
        return new vscode.Position(previousLine, document.lineAt(previousLine).text.length);
    }

    return end;
}

async function pickTask(tasks: TodoItem[]): Promise<TodoItem | undefined> {
    const items = tasks.map((task) => {
        const previewTags = (task.tags || []).slice(0, 3).join(', ');
        const tagDetails = previewTags ? `tags: ${previewTags}` : '';

        return {
            label: task.text || 'Untitled task',
            description: `${task.status} | ${task.priority}`,
            detail: tagDetails || undefined,
            task
        };
    });

    const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select the task to attach this code reference',
        matchOnDescription: true,
        matchOnDetail: true
    });

    return selected?.task;
}

async function revealSidebarAndOpenTaskModal(provider: TaskViewProvider, taskId: string): Promise<void> {
    await vscode.commands.executeCommand('workbench.view.extension.todo4vcode-explorer');
    provider.openTaskModal(taskId);
}
