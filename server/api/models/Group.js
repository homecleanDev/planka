/**
 * Group.js
 *
 * @description :: A model definition represents a database table/collection.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  attributes: {
    name: {
      type: 'string',
      required: true,
      isNotEmptyString: true,
    },

    users: {
      collection: 'User',
      via: 'groupId',
      through: 'UserGroup',
    },
  },

  tableName: 'group',
};
