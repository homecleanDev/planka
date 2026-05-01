module.exports.up = (knex) =>
  knex.schema.createTable('zoho_webhook_message', (table) => {
    table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
    table.bigInteger('project_id').notNullable();
    table.bigInteger('card_id').notNullable();
    table.text('external_message_id').notNullable();
    table.timestamp('created_at', true);
    table.timestamp('updated_at', true);

    table.unique(['project_id', 'external_message_id']);
    table.index('card_id');
  });

module.exports.down = (knex) => knex.schema.dropTable('zoho_webhook_message');
