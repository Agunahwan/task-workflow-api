import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/task.service';

type WorkspaceParams = {
    workspaceId: string;
};

type TransitionParams = {
    workspaceId: string;
    taskId: string;
};

type AssignBody = {
    assignee_id: string;
};

type TransitionBody = {
    to_state: 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
};


export const taskController = {
    async create(
        req: Request<{ workspaceId: string }>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const result = await taskService.createTask({
                tenantId: req.header('X-Tenant-Id')!,
                workspaceId: req.params.workspaceId, // ✅ string
                title: req.body.title,
                priority: req.body.priority,
                idempotencyKey: req.header('Idempotency-Key') ?? undefined
            });

            res.status(201).json(result);
        } catch (e) {
            next(e);
        }
    },

    async assign(
        req: Request<TransitionParams, unknown, AssignBody>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const version = req.header('If-Match-Version');
            const role = req.header('X-Role');

            if (!version || !role) {
                return res.status(400).json({ message: 'Missing headers' });
            }

            await taskService.assignTask({
                taskId: req.params.taskId,
                assigneeId: req.body.assignee_id,
                role: role as 'manager',
                version: Number(version),
            });

            res.status(204).send();
        } catch (e) {
            next(e);
        }
    },

    async transition(
        req: Request<TransitionParams, unknown, TransitionBody>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const role = req.header('X-Role');
            const userId = req.header('X-User-Id');
            const version = req.header('If-Match-Version');

            if (!role || !userId || !version) {
                return res.status(400).json({ message: 'Missing headers' });
            }

            await taskService.transitionTask({
                taskId: req.params.taskId,
                toState: req.body.to_state,
                role: role as 'agent' | 'manager',
                userId,
                version: Number(version)
            });

            res.status(204).send();
        } catch (e) {
            next(e);
        }
    },

    async getById(
        req: Request<{ workspaceId: string; taskId: string }>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const task = await taskService.getTaskWithEvents({
                taskId: req.params.taskId,
                workspaceId: req.params.workspaceId
            });

            res.json(task);
        } catch (e) {
            next(e);
        }
    },

    async list(
        req: Request<{ workspaceId: string }>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { state, assignee_id, limit, cursor } = req.query;

            const result = await taskService.listTasks({
                workspaceId: req.params.workspaceId,
                state: state as string,
                assigneeId: assignee_id as string,
                limit: limit ? parseInt(limit as string, 10) : undefined,
                cursor: cursor as string
            });

            res.json(result);
        } catch (e) {
            next(e);
        }
    }

};
