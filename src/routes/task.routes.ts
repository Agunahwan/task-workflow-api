import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { eventController } from '../controllers/event.controller';

const router = Router();

// CREATE TASK
router.post(
    '/workspaces/:workspaceId/tasks',
    taskController.create
);

// ASSIGN
router.post(
    '/workspaces/:workspaceId/tasks/:taskId/assign',
    taskController.assign
);

// TRANSITION
router.post(
    '/workspaces/:workspaceId/tasks/:taskId/transition',
    taskController.transition
);

// GET TASK
router.get(
    '/workspaces/:workspaceId/tasks/:taskId',
    taskController.getById
);

// LIST TASKS
router.get(
    '/v1/workspaces/:workspaceId/tasks',
    taskController.list
);

router.get('/v1/events', eventController.list);

export default router;
