module.exports.up = (knex) =>
  knex.schema.table('attachment', (table) => {
    table.dropColumn('url');
  });

module.exports.down = (knex) =>
  knex.schema.table('attachment', (table) => {
    // First add the column as nullable
    table.text('url');
  })
  .then(() => {
    // Update existing records with a default value
    return knex('attachment').update({ url: '' });
  })
  .then(() => {
    // Add NOT NULL constraint
    return knex.schema.table('attachment', (table) => {
      table.text('url').notNullable().alter();
    });
  });
