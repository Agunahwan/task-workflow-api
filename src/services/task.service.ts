import { db } from '../db/knex';
import { taskRepo } from '../repositories/task.repo';
import { eventRepo } from '../repositories/event.repo';
import { canTransition } from '../domain/task';
import { ConflictError, ForbiddenError } from '../domain/errors';
import { CreateTaskInput, AssignTaskParams, TransitionTaskInput, ListTasksParams, ListTasksResult } from './task.types';
import { NotFoundError } from '../errors/NotFoundError';
import { v4 as uuid } from 'uuid';
import { TaskRow } from '../repositories/types/task.repo.types';

export const taskService = {
    async createTask(input: CreateTaskInput) {
        const task: TaskRow = {
            task_id: uuid(),
            tenant_id: input.tenantId,
            workspace_id: input.workspaceId,
            title: input.title,
            priority: input.priority,
            state: 'NEW',
            version: 1
        };

        await taskRepo.insert(task);
        return { task_id: task.task_id, state: task.state, version: task.version };
    },

    async assignTask(params: AssignTaskParams) {
        const { taskId, assigneeId, role, version } = params;

        // Validate role
        if (role !== 'manager') {
            throw new ForbiddenError('Only manager can assign task');
        }

        const task = await taskRepo.findById(taskId);
        if (!task) throw new NotFoundError('Task not found');

        // Validate state
        if (['DONE', 'CANCELLED'].includes(task.state)) {
            throw new ConflictError(`Cannot assign task in state ${task.state}`);
        }

        try {
            await taskRepo.updateWithVersion(taskId, version, { assignee_id: assigneeId });
        } catch (e) {
            if ((e as Error).message === 'VERSION_CONFLICT') {
                throw new ConflictError('Version conflict');
            }
            throw e;
        }
    },

    async transitionTask(input: TransitionTaskInput): Promise<void> {
        const { taskId, toState, role, userId, version } = input;

        await db.transaction(async trx => {
            const task = await taskRepo.findById(taskId, trx); // ✅ pakai trx

            if (!task) throw new ConflictError('Task not found');

            // State machine check
            if (!canTransition(task.state, toState)) {
                throw new ConflictError('Invalid transition');
            }

            // Role rules
            if (role === 'agent') {
                if (
                    (task.state === 'NEW' && toState === 'IN_PROGRESS') ||
                    (task.state === 'IN_PROGRESS' && toState === 'DONE')
                ) {
                    if (task.assignee_id !== userId) throw new ConflictError('Task not assigned to agent');
                }
                if (toState === 'CANCELLED') throw new ForbiddenError('Agent cannot cancel task');
            }

            if (role === 'manager' && toState !== 'CANCELLED') {
                throw new ForbiddenError('Manager can only cancel');
            }

            // Optimistic locking update
            await taskRepo.updateWithVersion(taskId, version, { state: toState }, trx);

            // Insert outbox event
            await eventRepo.insert(
                {
                    event_id: uuid(),
                    task_id: taskId,
                    tenant_id: task.tenant_id,
                    type: 'TASK_TRANSITION',
                    payload: { from: task.state, to: toState },
                    created_at: new Date().toISOString()
                },
                trx
            );
        });
    },

    async getTaskWithEvents(params: { taskId: string; workspaceId: string }) {
        const { taskId, workspaceId } = params;

        const task = await taskRepo.findById(taskId);
        if (!task || task.workspace_id !== workspaceId) {
            throw new NotFoundError('Task not found');
        }

        const events = await eventRepo.findByTaskId(taskId, 20);

        return {
            task_id: task.task_id,
            title: task.title,
            priority: task.priority,
            state: task.state,
            assignee_id: task.assignee_id,
            version: task.version,
            events
        };
    },

    async listTasks(params: {
        workspaceId: string;
        state?: string;
        assigneeId?: string;
        limit?: number;
        cursor?: string;
    }) {
        const { workspaceId, state, assigneeId, limit = 20, cursor } = params;

        const tasks = await taskRepo.listTasks(
            workspaceId,
            { state, assigneeId },
            limit,
            cursor
        );

        let nextCursor: string | undefined;
        if (tasks.length > limit) {
            const lastTask = tasks.pop()!;
            nextCursor = Buffer.from(lastTask.task_id).toString('base64');
        }

        return { tasks, nextCursor };
    }
};
