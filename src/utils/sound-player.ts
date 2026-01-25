import * as vscode from 'vscode';
import { Logger } from './logger';
import { MEDIA_PATHS } from '../core/constants/media-paths';

export class SoundPlayer {
    public static playNotificationSound(extensionUri: vscode.Uri): void {
        try {
            const soundPath = vscode.Uri.joinPath(extensionUri, MEDIA_PATHS.SOUND_ALERT);
            const soundUri = soundPath.fsPath;

            const { execFile } = require('child_process');

            if (process.platform === 'darwin') {
                execFile('afplay', [soundUri], { timeout: 5000 }, (error: Error | null) => {
                    if (error) {
                        Logger.debug('Sound playback error on macOS', error);
                    }
                });
            } else if (process.platform === 'win32') {
                const mp3Command = `Add-Type -AssemblyName presentationCore; $player = New-Object system.windows.media.mediaplayer; $player.open('${soundUri}'); $player.Play(); Start-Sleep 5;`;
                execFile('powershell', ['-c', mp3Command], { timeout: 5000 }, (error: Error | null) => {
                    if (error) {
                        Logger.debug('Sound playback error on Windows', error);
                    }
                });
            } else {
                execFile('ffplay', ['-nodisp', '-autoexit', soundUri], { timeout: 5000 }, (error: Error | null) => {
                    if (error) {
                        Logger.debug('Sound playback error on Linux', error);
                    }
                });
            }
        } catch (error) {
            Logger.debug('Sound playback error', error);
        }
    }
}
