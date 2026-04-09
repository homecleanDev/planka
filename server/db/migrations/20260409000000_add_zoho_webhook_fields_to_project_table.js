module.exports.up = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.text('zoho_webhook_token');
    table.bigInteger('zoho_webhook_list_id');
    table.jsonb('zoho_webhook_user_ids');
    table.bigInteger('zoho_webhook_creator_user_id');

    table.index('zoho_webhook_token');
    table.index('zoho_webhook_list_id');
  });

module.exports.down = (knex) =>
  knex.schema.alterTable('project', (table) => {
    table.dropIndex(['zoho_webhook_token'], 'project_zoho_webhook_token_index');
    table.dropIndex(['zoho_webhook_list_id'], 'project_zoho_webhook_list_id_index');
    table.dropColumn('zoho_webhook_token');
    table.dropColumn('zoho_webhook_list_id');
    table.dropColumn('zoho_webhook_user_ids');
    table.dropColumn('zoho_webhook_creator_user_id');
  });
