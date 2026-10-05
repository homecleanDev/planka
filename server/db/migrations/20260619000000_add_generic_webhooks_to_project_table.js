module.exports.up = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.jsonb('generic_webhooks');
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.dropColumn('generic_webhooks');
  });
