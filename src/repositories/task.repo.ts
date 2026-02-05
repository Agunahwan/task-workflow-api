import { db } from '../db/knex';
import { TaskRow } from './types/task.repo.types';
import { Knex } from 'knex';

export const taskRepo = {
    async insert(task: TaskRow, trx?: Knex.Transaction) {
        const query = db('tasks').insert(task);
        return trx ? query.transacting(trx) : query;
    },

    async findById(taskId: string, trx?: Knex.Transaction) {
        const query = db('tasks').where({ task_id: taskId }).first();
        return trx ? query.transacting(trx) : query;
    },

    async updateWithVersion(
        taskId: string,
        version: number,
        updateData: Partial<TaskRow>,
        trx?: Knex.Transaction
    ) {
        const query = db('tasks')
            .where({ task_id: taskId, version })
            .update({
                ...updateData,
                version: db.raw('version + 1')
            });

        const affected = trx ? await query.transacting(trx) : await query;
        if (affected === 0) {
            throw new Error('VERSION_CONFLICT');
        }
        return affected;
    },

    listTasks(
        workspaceId: string,
        filters: { state?: string; assigneeId?: string },
        limit = 20,
        cursor?: string
    ) {
        let query = db('tasks').where('workspace_id', workspaceId);

        if (filters.state) query = query.andWhere('state', filters.state);
        if (filters.assigneeId) query = query.andWhere('assignee_id', filters.assigneeId);

        if (cursor) {
            const lastTaskId = Buffer.from(cursor, 'base64').toString('utf-8');
            query = query.andWhere('task_id', '>', lastTaskId);
        }

        return query.orderBy('task_id').limit(limit + 1); // fetch extra to check nextCursor
    }
};
