module.exports.up = async (knex) => {
  const hasProjectColumn = await knex.schema.hasColumn('project', 'card_fields');
  if (!hasProjectColumn) {
    await knex.schema.table('project', (table) => {
      table.json('card_fields');
    });
  }

  const hasCardColumn = await knex.schema.hasColumn('card', 'card_fields');
  if (!hasCardColumn) {
    await knex.schema.table('card', (table) => {
      table.json('card_fields');
    });
  }
};

module.exports.down = async (knex) => {
  const hasProjectColumn = await knex.schema.hasColumn('project', 'card_fields');
  if (hasProjectColumn) {
    await knex.schema.table('project', (table) => {
      table.dropColumn('card_fields');
    });
  }

  const hasCardColumn = await knex.schema.hasColumn('card', 'card_fields');
  if (hasCardColumn) {
    await knex.schema.table('card', (table) => {
      table.dropColumn('card_fields');
    });
  }
};
