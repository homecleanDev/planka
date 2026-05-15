const criteriaValidator = (value) => _.isArray(value) || _.isPlainObject(value);

module.exports = {
  inputs: {
    criteria: {
      type: 'json',
      custom: criteriaValidator,
    },
    limit: {
      type: 'number',
      min: 1,
    },
  },

  async fn(inputs) {
    let query = Card.find(inputs.criteria).sort('position');

    if (!_.isUndefined(inputs.limit)) {
      query = query.limit(inputs.limit);
    }

    return query;
  },
};
