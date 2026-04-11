import * as vscode from 'vscode';

class InMemoryMemento implements vscode.Memento {
    private readonly _storage = new Map<string, unknown>();

    public keys(): readonly string[] {
        return [...this._storage.keys()];
    }

    public get<T>(key: string, defaultValue?: T): T {
        const value = this._storage.get(key);
        if (value === undefined) {
            return defaultValue as T;
        }

        return value as T;
    }

    public async update(key: string, value: unknown): Promise<void> {
        if (value === undefined) {
            this._storage.delete(key);
            return;
        }

        this._storage.set(key, value);
    }
}

export function createTestExtensionContext(): vscode.ExtensionContext {
    const subscriptions: { dispose(): unknown }[] = [];

    return {
        workspaceState: new InMemoryMemento(),
        globalState: new InMemoryMemento(),
        subscriptions,
        extensionUri: { path: '/tmp' } as vscode.Uri
    } as unknown as vscode.ExtensionContext;
}
