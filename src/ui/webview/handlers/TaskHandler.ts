import * as vscode from 'vscode';
import * as path from 'path';
import { TaskService } from '../../../core/services/TaskService';
import {
    AddTaskMessage,
    UpdateStatusMessage,
    UpdatePriorityMessage,
    UpdateTaskTextMessage,
    UpdateDescriptionMessage,
    UpdateTagsMessage,
    UpdateDueDateMessage,
    UpdateRemindersMessage,
    UpdateOrdersMessage,
    DeleteTaskMessage,
    AddSubtaskMessage,
    ToggleSubtaskMessage,
    DeleteSubtaskMessage,
    UpdateSubtaskTextMessage,
    OpenCodeLinkMessage,
    WebviewMessage
} from '../../../core/models/webview-messages';
import { BaseHandler } from './BaseHandler';
import { Logger } from '../../../utils/logger';

export class TaskHandler extends BaseHandler {
    constructor(private readonly _taskService: TaskService) {
        super();
    }

    protected async handle(message: WebviewMessage, webview: vscode.Webview | vscode.WebviewPanel | vscode.WebviewView): Promise<void> {
        const targetWebview = 'webview' in webview ? webview.webview : webview;

        switch (message.type) {
            case 'addTask':
                await this._taskService.addTask((message as AddTaskMessage).value);
                break;
            case 'updateStatus':
                await this._taskService.updateStatus((message as UpdateStatusMessage).id, (message as UpdateStatusMessage).status);
                break;
            case 'updatePriority':
                await this._taskService.updatePriority((message as UpdatePriorityMessage).id, (message as UpdatePriorityMessage).priority);
                break;
            case 'updateTaskText':
                await this._taskService.updateTaskText((message as UpdateTaskTextMessage).id, (message as UpdateTaskTextMessage).text);
                break;
            case 'updateDescription':
                await this._taskService.updateDescription((message as UpdateDescriptionMessage).id, (message as UpdateDescriptionMessage).description);
                break;
            case 'updateTags':
                await this._taskService.updateTags((message as UpdateTagsMessage).id, (message as UpdateTagsMessage).tags);
                break;
            case 'updateDueDate':
                await this._taskService.updateDueDate((message as UpdateDueDateMessage).id, (message as UpdateDueDateMessage).dueDate);
                break;
            case 'updateReminders':
                await this._taskService.updateReminders((message as UpdateRemindersMessage).id, (message as UpdateRemindersMessage).reminders);
                break;
            case 'updateOrders':
                await this._taskService.updateOrders((message as UpdateOrdersMessage).orders);
                break;
            case 'deleteTask':
                await this._taskService.deleteTask((message as DeleteTaskMessage).id);
                break;
            case 'addSubtask':
                await this._taskService.addSubtask((message as AddSubtaskMessage).taskId, (message as AddSubtaskMessage).text);
                break;
            case 'toggleSubtask':
                await this._taskService.toggleSubtask((message as ToggleSubtaskMessage).taskId, (message as ToggleSubtaskMessage).subtaskId);
                break;
            case 'deleteSubtask':
                await this._taskService.deleteSubtask((message as DeleteSubtaskMessage).taskId, (message as DeleteSubtaskMessage).subtaskId);
                break;
            case 'updateSubtaskText':
                await this._taskService.updateSubtaskText(
                    (message as UpdateSubtaskTextMessage).taskId,
                    (message as UpdateSubtaskTextMessage).subtaskId,
                    (message as UpdateSubtaskTextMessage).text
                );
                break;
            case 'openCodeLink':
                await this._openCodeLink((message as OpenCodeLinkMessage).value);
                break;
            default:
                Logger.warn(`TaskHandler received unhandled message type: ${(message as WebviewMessage).type}`);
        }
    }

    private async _openCodeLink(rawValue: string): Promise<void> {
        const parsedTarget = this._parseCodeLinkValue(rawValue);
        if (!parsedTarget) {
            return;
        }

        const resolved = await this._resolveCodeLinkTarget(parsedTarget.path);
        if (!resolved) {
            vscode.window.showWarningMessage(`Link not found: ${rawValue}`);
            return;
        }

        const isDirectory = (resolved.stat.type & vscode.FileType.Directory) === vscode.FileType.Directory;
        if (isDirectory) {
            await vscode.commands.executeCommand('revealInExplorer', resolved.uri);
            return;
        }

        const textDoc = await vscode.workspace.openTextDocument(resolved.uri);
        const editor = await vscode.window.showTextDocument(textDoc, { preview: false });

        if (!parsedTarget.line || parsedTarget.line < 1) {
            return;
        }

        const targetLine = Math.min(Math.max(parsedTarget.line - 1, 0), Math.max(textDoc.lineCount - 1, 0));
        const desiredColumn = parsedTarget.column && parsedTarget.column > 0 ? parsedTarget.column - 1 : 0;
        const targetColumn = Math.min(desiredColumn, textDoc.lineAt(targetLine).text.length);
        const position = new vscode.Position(targetLine, targetColumn);
        const range = new vscode.Range(position, position);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    }

    private _parseCodeLinkValue(rawValue: string): { path: string; line?: number; column?: number } | undefined {
        if (typeof rawValue !== 'string') {
            return undefined;
        }

        let value = rawValue.trim();
        if (!value) {
            return undefined;
        }

        if (
            (value.startsWith('`') && value.endsWith('`')) ||
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith('\'') && value.endsWith('\''))
        ) {
            value = value.slice(1, -1).trim();
        }

        if (!value) {
            return undefined;
        }

        let parsedPath = value;
        let line: number | undefined;
        let column: number | undefined;
        const locationMatch = value.match(/:(\d+)(?::(\d+))?$/);

        if (locationMatch && typeof locationMatch.index === 'number') {
            const candidatePath = value.slice(0, locationMatch.index);
            if (candidatePath && !candidatePath.endsWith(':')) {
                parsedPath = candidatePath;
                line = Number.parseInt(locationMatch[1], 10);
                if (locationMatch[2]) {
                    column = Number.parseInt(locationMatch[2], 10);
                }
            }
        }

        parsedPath = parsedPath.replace(/[\\/]+$/, '').replace(/^\.\//, '').trim();
        if (!parsedPath) {
            return undefined;
        }

        const hasPathSeparator = /[\\/]/.test(parsedPath);
        const hasFileExtension = /\.[A-Za-z0-9_-]{1,16}$/.test(parsedPath);
        const isAbsolutePath = path.isAbsolute(parsedPath);
        const fileName = path.basename(parsedPath);
        const knownFileNames = new Set(['Dockerfile', 'Makefile', 'Procfile']);

        if (!hasPathSeparator && !hasFileExtension && !isAbsolutePath && !knownFileNames.has(fileName)) {
            return undefined;
        }

        return { path: parsedPath, line, column };
    }

    private async _resolveCodeLinkTarget(targetPath: string): Promise<{ uri: vscode.Uri; stat: vscode.FileStat } | undefined> {
        const normalizedTarget = targetPath.replace(/\\/g, '/').trim();
        const candidateUris: vscode.Uri[] = [];

        if (path.isAbsolute(targetPath)) {
            candidateUris.push(vscode.Uri.file(targetPath));
        }

        const workspaceFolders = vscode.workspace.workspaceFolders || [];
        for (const folder of workspaceFolders) {
            candidateUris.push(vscode.Uri.joinPath(folder.uri, targetPath));

            const folderPrefix = `${folder.name}/`;
            if (normalizedTarget.startsWith(folderPrefix)) {
                const withoutFolderPrefix = normalizedTarget.slice(folderPrefix.length);
                if (withoutFolderPrefix) {
                    candidateUris.push(vscode.Uri.joinPath(folder.uri, withoutFolderPrefix));
                }
            }
        }

        const resolvedCandidate = await this._firstExistingUri(candidateUris);
        if (resolvedCandidate) {
            return resolvedCandidate;
        }

        const fileName = path.basename(normalizedTarget);
        if (!fileName) {
            return undefined;
        }

        const foundUris = await vscode.workspace.findFiles(
            `**/${fileName}`,
            '**/{node_modules,.git,.next,.nuxt,dist,build,out,coverage,.vscode-test}/**',
            60
        );

        if (foundUris.length === 0) {
            return undefined;
        }

        const expectedSuffix = normalizedTarget.toLowerCase();
        const bestCandidate =
            foundUris.find((uri) =>
                vscode.workspace.asRelativePath(uri, false).replace(/\\/g, '/').toLowerCase().endsWith(expectedSuffix)
            ) || foundUris[0];

        const bestStat = await this._safeStat(bestCandidate);
        if (!bestStat) {
            return undefined;
        }

        return { uri: bestCandidate, stat: bestStat };
    }

    private async _firstExistingUri(candidates: vscode.Uri[]): Promise<{ uri: vscode.Uri; stat: vscode.FileStat } | undefined> {
        const seen = new Set<string>();
        for (const uri of candidates) {
            const key = uri.toString();
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);

            const stat = await this._safeStat(uri);
            if (!stat) {
                continue;
            }

            return { uri, stat };
        }

        return undefined;
    }

    private async _safeStat(uri: vscode.Uri): Promise<vscode.FileStat | undefined> {
        try {
            return await vscode.workspace.fs.stat(uri);
        } catch {
            return undefined;
        }
    }
}
