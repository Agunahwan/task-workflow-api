import request from 'supertest';
import app from '../app';
import { setupDb, teardownDb, testDb } from './helpers/db';
import { v4 as uuid } from 'uuid';

describe('Task API - Minimum Required Tests', () => {
    let workspaceId = 'w1';
    let tenantId = 't1';
    let agentId = 'u_agent';
    let managerId = 'u_manager';
    let taskId: string;

    beforeAll(async () => {
        await setupDb();
    });

    afterAll(async () => {
        await teardownDb();
    });

    test('1) Idempotent create', async () => {
        const idempotencyKey = 'idem-key-123';
        const res1 = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'manager')
            .set('Idempotency-Key', idempotencyKey)
            .send({ title: 'Test Task', priority: 'MEDIUM' });

        const res2 = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'manager')
            .set('Idempotency-Key', idempotencyKey)
            .send({ title: 'Test Task', priority: 'MEDIUM' });

        expect(res1.status).toBe(201);
        expect(res1.body.task_id).toBeDefined();
        expect(res2.body.task_id).toBe(res1.body.task_id); // ✅ same task for same idempotency key

        taskId = res1.body.task_id;
    });

    test('2) Invalid transition returns 409', async () => {
        // seed task
        await testDb('tasks').insert({
            task_id: taskId,
            tenant_id: tenantId,
            workspace_id: workspaceId,
            title: 'Test Task',
            priority: 'MEDIUM',
            state: 'NEW',
            version: 1
        });

        const res = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/transition`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'agent')
            .set('X-User-Id', agentId)
            .set('If-Match-Version', '1')
            .send({ to_state: 'DONE' }); // invalid from NEW -> DONE

        expect(res.status).toBe(409);
    });

    test('3) Agent cannot complete unassigned task', async () => {
        const res = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/transition`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'agent')
            .set('X-User-Id', agentId)
            .set('If-Match-Version', '1')
            .send({ to_state: 'IN_PROGRESS' }); // agent not assignee

        expect(res.status).toBe(409);
    });

    test('4) Optimistic locking version conflict', async () => {
        // manager assigns task
        const assignRes = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/assign`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'manager')
            .set('If-Match-Version', '1')
            .send({ assignee_id: agentId });

        expect(assignRes.status).toBe(200);

        // old version → conflict
        const conflictRes = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/assign`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'manager')
            .set('If-Match-Version', '1') // old version
            .send({ assignee_id: agentId });

        expect(conflictRes.status).toBe(409);
    });

    test('5) Outbox event created on transition', async () => {
        const res = await request(app)
            .post(`/v1/workspaces/${workspaceId}/tasks/${taskId}/transition`)
            .set('X-Tenant-Id', tenantId)
            .set('X-Role', 'agent')
            .set('X-User-Id', agentId)
            .set('If-Match-Version', '2') // updated version from assign
            .send({ to_state: 'IN_PROGRESS' });

        expect(res.status).toBe(200);

        // check last 10 events
        const events = await testDb('task_events')
            .where({ task_id: taskId })
            .orderBy('created_at', 'desc')
            .limit(10);

        const lastEvent = events[0];
        expect(lastEvent).toBeDefined();
        expect(lastEvent.type).toBe('TASK_TRANSITION');
        expect(lastEvent.payload.from).toBe('NEW');
        expect(lastEvent.payload.to).toBe('IN_PROGRESS');
    });
});
