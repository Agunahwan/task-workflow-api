export type Role = 'agent' | 'manager';

export function assertRole(value: string): asserts value is Role {
    if (value !== 'agent' && value !== 'manager') {
        throw new Error('Invalid role');
    }
}
