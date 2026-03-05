module.exports.up = (knex) =>
  knex.schema
    .createTable('group', (table) => {
      table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
      table.text('name').notNullable().unique();
      table.timestamp('created_at', true);
      table.timestamp('updated_at', true);
    })
    .createTable('user_group', (table) => {
      table.bigInteger('id').primary().defaultTo(knex.raw('next_id()'));
      table.bigInteger('user_id').notNullable();
      table.bigInteger('group_id').notNullable();
      table.timestamp('created_at', true);
      table.timestamp('updated_at', true);

      table.unique(['user_id', 'group_id']);
      table.index('group_id');
    });

module.exports.down = (knex) => knex.schema.dropTable('user_group').dropTable('group');
