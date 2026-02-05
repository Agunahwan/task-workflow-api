import request from 'supertest';
import app from '../app';
import { setupDb, teardownDb, testDb } from './helpers/db';
import { v4 as uuid } from 'uuid';

beforeAll(async () => {
    await setupDb();
});

afterAll(async () => {
    await teardownDb();
});

describe('Task transition', () => {
    it('returns 409 on invalid transition', async () => {
        const taskId = 't1';

        // seed task
        await testDb('tasks').insert({
            task_id: taskId,
            tenant_id: 't1',
            workspace_id: 'w1',
            title: 'Test task',
            priority: 'MEDIUM',
            state: 'NEW',
            version: 1
        });

        const res = await request(app)
            .post(`/v1/workspaces/w1/tasks/${taskId}/transition`)
            .set('X-Tenant-Id', 't1')
            .set('X-Role', 'agent')
            .set('X-User-Id', 'u_agent')
            .set('If-Match-Version', '1')
            .send({ to_state: 'DONE' });

        expect(res.status).toBe(409);
    });
});
