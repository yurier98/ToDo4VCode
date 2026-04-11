import { execFileSync } from 'node:child_process';
import * as path from 'path';

function run(): void {
    const mockModulePath = path.resolve(__dirname, 'mocks');
    const env = {
        ...process.env,
        NODE_PATH: process.env.NODE_PATH
            ? `${mockModulePath}${path.delimiter}${process.env.NODE_PATH}`
            : mockModulePath
    };

    try {
        execFileSync(process.execPath, ['--test', path.resolve(__dirname, 'suite', '*.test.js')], {
            stdio: 'inherit',
            env
        });
    } catch (error) {
        const errorWithStatus = error as { status?: number };
        process.exit(typeof errorWithStatus.status === 'number' ? errorWithStatus.status : 1);
    }
}

run();
