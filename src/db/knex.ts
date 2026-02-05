import knex from 'knex';

export const db = knex({
    client: 'sqlite3',
    connection: {
        filename: './dev.sqlite3'
    },
    useNullAsDefault: true
});
