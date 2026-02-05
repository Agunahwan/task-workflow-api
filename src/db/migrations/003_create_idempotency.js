exports.up = function (knex) {
    return knex.schema.createTable('idempotency_keys', table => {
        table.string('key').primary();
        table.string('tenant_id').notNullable();
        table.string('endpoint').notNullable();
        table.json('response').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
}

exports.down = function (knex) {
    return knex.schema.dropTable('idempotency_keys');
}
