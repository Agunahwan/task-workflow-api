exports.up = function (knex) {
    return knex.schema.createTable('task_events', table => {
        table.uuid('event_id').primary();
        table.uuid('task_id').notNullable();
        table.string('tenant_id').notNullable();
        table.string('type').notNullable();
        table.json('payload').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

exports.down = function (knex) {
    return knex.schema.dropTable('task_events');
}
