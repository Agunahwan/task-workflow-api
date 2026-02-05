exports.up = function (knex) {
    return knex.schema.createTable('tasks', table => {
        table.uuid('task_id').primary();
        table.string('tenant_id').notNullable();
        table.string('workspace_id').notNullable();
        table.string('title', 120).notNullable();
        table.string('priority').notNullable();
        table.string('state').notNullable();
        table.string('assignee_id');
        table.integer('version').notNullable();
        table.timestamps(true, true);
    });
}

exports.down = function (knex) {
    return knex.schema.dropTable('tasks');
}
