type Listener<T> = (event: T) => void;

class Disposable {
    private readonly _disposeFn: () => void;

    constructor(disposeFn: () => void) {
        this._disposeFn = disposeFn;
    }

    public dispose(): void {
        this._disposeFn();
    }
}

class EventEmitter<T> {
    private readonly _listeners = new Set<Listener<T>>();

    public readonly event = (listener: Listener<T>): { dispose: () => void } => {
        this._listeners.add(listener);
        return new Disposable(() => {
            this._listeners.delete(listener);
        });
    };

    public fire(event: T): void {
        for (const listener of this._listeners) {
            listener(event);
        }
    }

    public dispose(): void {
        this._listeners.clear();
    }
}

class OutputChannel {
    public appendLine(_value: string): void {
        // no-op
    }

    public show(): void {
        // no-op
    }
}

class FileSystemError extends Error {
    public readonly code: string;

    constructor(code: string, message?: string) {
        super(message || code);
        this.code = code;
    }
}

const configurationStore = new Map<string, unknown>();

function toConfigKey(section: string, key: string): string {
    return section ? `${section}.${key}` : key;
}

const workspace = {
    workspaceFolders: [] as Array<{ name: string; uri: { path: string } }>,
    storageUri: undefined as unknown,
    getConfiguration(section = ''): {
        get<T>(key: string, defaultValue: T): T;
        update(key: string, value: unknown): Promise<void>;
    } {
        return {
            get<T>(key: string, defaultValue: T): T {
                const value = configurationStore.get(toConfigKey(section, key));
                return (value === undefined ? defaultValue : (value as T));
            },
            async update(key: string, value: unknown): Promise<void> {
                configurationStore.set(toConfigKey(section, key), value);
            }
        };
    },
    onDidChangeConfiguration(): { dispose: () => void } {
        return new Disposable(() => undefined);
    },
    async findFiles(): Promise<unknown[]> {
        return [];
    },
    asRelativePath(): string {
        return '';
    },
    fs: {
        async readFile(): Promise<Uint8Array> {
            throw new FileSystemError('FileNotFound');
        },
        async writeFile(): Promise<void> {
            // no-op
        },
        async stat(): Promise<unknown> {
            throw new FileSystemError('FileNotFound');
        },
        async createDirectory(): Promise<void> {
            // no-op
        }
    }
};

const window = {
    createOutputChannel(): OutputChannel {
        return new OutputChannel();
    },
    async showInformationMessage(): Promise<undefined> {
        return undefined;
    },
    async showWarningMessage(): Promise<undefined> {
        return undefined;
    },
    async showErrorMessage(): Promise<undefined> {
        return undefined;
    }
};

const uri = {
    joinPath(base: { path: string }, ...paths: string[]): { path: string; fsPath: string; toString(): string } {
        const joinedPath = [base.path, ...paths].join('/').replace(/\/+/g, '/');
        return {
            path: joinedPath,
            fsPath: joinedPath,
            toString(): string {
                return joinedPath;
            }
        };
    }
};

function resetMockConfiguration(): void {
    configurationStore.clear();
}

export {
    Disposable,
    EventEmitter,
    FileSystemError,
    uri as Uri,
    workspace,
    window,
    resetMockConfiguration
};

export type { Listener };
