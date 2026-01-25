import * as vscode from 'vscode';

export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warn = 2,
    Error = 3
}

export class Logger {
    private static outputChannel: vscode.OutputChannel | undefined;
    private static logLevel: LogLevel = LogLevel.Info;

    public static initialize(channelName: string = 'ToDo4VCode'): void {
        if (!Logger.outputChannel) {
            Logger.outputChannel = vscode.window.createOutputChannel(channelName);
        }
    }

    public static setLogLevel(level: LogLevel): void {
        Logger.logLevel = level;
    }

    public static debug(message: string, ...args: unknown[]): void {
        if (Logger.logLevel <= LogLevel.Debug) {
            Logger.log('DEBUG', message, ...args);
        }
    }

    public static info(message: string, ...args: unknown[]): void {
        if (Logger.logLevel <= LogLevel.Info) {
            Logger.log('INFO', message, ...args);
        }
    }

    public static warn(message: string, ...args: unknown[]): void {
        if (Logger.logLevel <= LogLevel.Warn) {
            Logger.log('WARN', message, ...args);
        }
    }

    public static error(message: string, error?: Error | unknown, ...args: unknown[]): void {
        if (Logger.logLevel <= LogLevel.Error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            const stack = error instanceof Error ? error.stack : undefined;
            Logger.log('ERROR', message, errorMessage, stack, ...args);
        }
    }

    private static log(level: string, message: string, ...args: unknown[]): void {
        if (!Logger.outputChannel) {
            Logger.initialize();
        }
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${level}] ${message}`;
        if (args.length > 0) {
            Logger.outputChannel!.appendLine(`${formattedMessage} ${JSON.stringify(args, null, 2)}`);
        } else {
            Logger.outputChannel!.appendLine(formattedMessage);
        }
    }

    public static showOutputChannel(): void {
        if (Logger.outputChannel) {
            Logger.outputChannel.show();
        }
    }
}
