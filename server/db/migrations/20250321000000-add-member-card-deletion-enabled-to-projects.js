module.exports.up = async (knex) => {
  // Check if the column already exists
  const hasColumn = await knex.schema.hasColumn('project', 'member_card_deletion_enabled');

  if (!hasColumn) {
    await knex.schema.table('project', (table) => {
      table.boolean('member_card_deletion_enabled').notNullable().defaultTo(false);
    });
  }
};

module.exports.down = async (knex) => {
  // Check if the column exists before trying to drop it
  const hasColumn = await knex.schema.hasColumn('project', 'member_card_deletion_enabled');

  if (hasColumn) {
    await knex.schema.table('project', (table) => {
      table.dropColumn('member_card_deletion_enabled');
    });
  }
};
