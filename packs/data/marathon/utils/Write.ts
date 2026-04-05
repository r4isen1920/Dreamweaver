// @ts-nocheck

import { ensureDirSync } from '@std/fs';
import { dirname } from '@std/path';
import { applyEdits, format } from 'jsonc-parser';
import { createLogger, type Logger } from './Logger.ts';

const defaultLogger = createLogger('write');


export function writeJsonFile(path: string, data: any, logger: Logger = defaultLogger) {
    let finalPath = '';
    if (path.startsWith('RP')) {
        finalPath = Deno.env.get('MARATHON_RP_DIR');
    }
    else if (path.startsWith('BP')) {
        finalPath = Deno.env.get('MARATHON_BP_DIR');
    }
    finalPath = finalPath + path.slice(2);

    ensureDirSync(dirname(finalPath));
    const content = formatJson(data);
    logger.info(`Writing file to ${finalPath}...`);
    Deno.writeTextFileSync(finalPath, content);
}

function formatJson(data: any): string {
    const raw = JSON.stringify(data);
    const edits = format(raw, undefined, {
        insertSpaces: false,
    });

    if (edits.length === 0) {
        return raw;
    }

    return applyEdits(raw, edits);
}

