module.exports = {
  tableName: 'webhook_logs',

  attributes: {
    source: {
      type: 'string',
      required: true,
    },
    token: {
      type: 'string',
      allowNull: true,
    },
    payload: {
      type: 'json',
      required: true,
    },
  },
};
