/**
 * UserGroup.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    userId: {
      model: 'User',
      required: true,
      columnName: 'user_id',
    },
    groupId: {
      model: 'Group',
      required: true,
      columnName: 'group_id',
    },
  },

  tableName: 'user_group',
};
