import { TaskState } from '../domain/task';
import { TaskRow } from '../repositories/types/task.repo.types'

export type CreateTaskInput = {
    tenantId: string;
    workspaceId: string;
    title: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    idempotencyKey?: string;
};

export type TransitionTaskInput = {
    taskId: string;
    toState: TaskState;
    role: 'agent' | 'manager';
    userId: string;
    version: number;
};

export interface AssignTaskParams {
    taskId: string;
    assigneeId: string;
    role: 'agent' | 'manager';
    version: number;
}

export interface ListTasksParams {
    workspaceId: string;
    state?: string;
    assigneeId?: string;
    limit?: number;
    cursor?: string; // base64 encoded last task_id
}

export interface ListTasksResult {
    tasks: TaskRow[];
    nextCursor?: string;
}