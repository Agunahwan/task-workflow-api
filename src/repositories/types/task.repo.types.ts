import { TaskState } from '../../domain/task';

export type TaskRow = {
    task_id: string;
    tenant_id: string;
    workspace_id: string;
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    state: TaskState;
    assignee_id?: string | null;
    version: number;
    created_at?: string;
    updated_at?: string;
};

export type CreateTaskInput = Omit<
    TaskRow,
    'task_id' | 'created_at' | 'updated_at'
>;
