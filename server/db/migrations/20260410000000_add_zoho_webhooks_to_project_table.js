module.exports.up = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.jsonb('zoho_webhooks');
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.dropColumn('zoho_webhooks');
  });
