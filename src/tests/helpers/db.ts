import knex from 'knex';
const knexfile = require('../../../knexfile');

export const testDb = knex({
  ...knexfile.development,
  connection: {
    filename: ':memory:'
  }
});

export async function setupDb() {
  await testDb.migrate.latest();
}

export async function teardownDb() {
  await testDb.destroy();
}
