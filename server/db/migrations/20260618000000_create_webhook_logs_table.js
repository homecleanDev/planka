module.exports.up = (knex) =>
  knex.schema.createTable('webhook_logs', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.text('source').notNullable();
    table.text('token');
    table.jsonb('payload').notNullable();
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    table.index(['source', 'created_at']);
    table.index('token');
  });

module.exports.down = (knex) => knex.schema.dropTable('webhook_logs');
