export function encodeCursor(value: string | number): string {
    return Buffer.from(String(value)).toString('base64');
}

export function decodeCursor(cursor?: string): string | null {
    if (!cursor) return null;
    return Buffer.from(cursor, 'base64').toString('utf8');
}
