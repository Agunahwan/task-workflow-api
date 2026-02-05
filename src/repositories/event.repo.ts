import { db } from '../db/knex';
import { Knex } from 'knex';

export const eventRepo = {
    async insert(event: any, trx?: Knex.Transaction) {
        const query = db('task_events').insert(event);
        return trx ? query.transacting(trx) : query;
    },

    async findByTaskId(taskId: string, limit = 20, trx?: Knex.Transaction) {
        const query = db('task_events')
            .where({ task_id: taskId })
            .orderBy('created_at', 'desc')
            .limit(limit);

        return trx ? query.transacting(trx) : query;
    },

    findAll(limit = 50) {
        return db('task_events').orderBy('created_at', 'desc').limit(limit);
    }
};
