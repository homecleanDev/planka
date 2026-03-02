const moment = require('moment');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  POSITION_MUST_BE_PRESENT: {
    positionMustBePresent: 'Position must be present',
  },
};

const dueDateValidator = (value) => moment(value, moment.ISO_8601, true).isValid();

const stopwatchValidator = (value) => {
  if (!_.isPlainObject(value) || _.size(value) !== 2) {
    return false;
  }

  if (
    !_.isNull(value.startedAt) &&
    _.isString(value.startedAt) &&
    !moment(value.startedAt, moment.ISO_8601, true).isValid()
  ) {
    return false;
  }

  if (!_.isFinite(value.total)) {
    return false;
  }

  return true;
};

const cardFieldsValidator = (value) => {
  if (_.isNull(value)) {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (field) =>
      _.isPlainObject(field) &&
      _.isString(field.id) &&
      field.id.length > 0 &&
      _.isString(field.name) &&
      field.name.trim().length > 0 &&
      (_.isNil(field.value) || _.isString(field.value)),
  );
};

module.exports = {
  inputs: {
    listId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    position: {
      type: 'number',
    },
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    dueDate: {
      type: 'string',
      custom: dueDateValidator,
    },
    stopwatch: {
      type: 'json',
      custom: stopwatchValidator,
    },
    cardFields: {
      type: 'json',
      custom: cardFieldsValidator,
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    positionMustBePresent: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, list } = await sails.helpers.lists
      .getProjectPath(inputs.listId)
      .intercept('pathNotFound', () => Errors.LIST_NOT_FOUND);

    const boardMembership = await BoardMembership.findOne({
      boardId: board.id,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.LIST_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const project = await Project.findOne(board.projectId);
    let cardFields = inputs.cardFields;

    if (_.isUndefined(cardFields) && project && Array.isArray(project.cardFields)) {
      cardFields = project.cardFields.map((field) => ({
        ...field,
        value: null,
      }));
    }

    const values = _.pick(inputs, ['position', 'name', 'description', 'dueDate', 'stopwatch']);

    if (!_.isUndefined(cardFields)) {
      values.cardFields = cardFields;
    }

    const card = await sails.helpers.cards.createOne
      .with({
        board,
        values: {
          ...values,
          list,
          creatorUser: currentUser,
        },
        request: this.req,
      })
      .intercept('positionMustBeInValues', () => Errors.POSITION_MUST_BE_PRESENT);

    return {
      item: card,
    };
  },
};
