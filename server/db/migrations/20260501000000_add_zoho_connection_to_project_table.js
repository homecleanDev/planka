module.exports.up = (knex) =>
  knex.schema.table('project', (table) => {
    table.jsonb('zoho_connection');
  });

module.exports.down = (knex) =>
  knex.schema.table('project', (table) => {
    table.dropColumn('zoho_connection');
  });
