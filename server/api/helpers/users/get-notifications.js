const idOrIdsValidator = (value) => _.isString(value) || _.every(value, _.isString);

module.exports = {
  inputs: {
    idOrIds: {
      type: 'json',
      custom: idOrIdsValidator,
      required: true,
    },
    limit: {
      type: 'number',
      min: 1,
    },
  },

  async fn(inputs) {
    return sails.helpers.notifications.getMany.with({
      criteria: {
        isRead: false,
        userId: inputs.idOrIds,
      },
      limit: inputs.limit,
    });
  },
};
