const moment = require('moment');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  BOARD_NOT_FOUND: {
    boardNotFound: 'Board not found',
  },
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
  LIST_MUST_BE_PRESENT: {
    listMustBePresent: 'List must be present',
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

const getNewMentionUserIds = async (nextText, prevText, users) => {
  if (!nextText) {
    return [];
  }

  const nextMentions = await sails.helpers.mentions.getMentions(nextText, users);
  const prevMentions = prevText ? await sails.helpers.mentions.getMentions(prevText, users) : [];

  return _.difference(_.uniq(nextMentions.filter(Boolean)), _.uniq(prevMentions.filter(Boolean)));
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
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    boardId: {
      type: 'string',
      regex: /^[0-9]+$/,
    },
    listId: {
      type: 'string',
      regex: /^[0-9]+$/,
    },
    coverAttachmentId: {
      type: 'string',
      regex: /^[0-9]+$/,
      allowNull: true,
    },
    position: {
      type: 'number',
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
    },
    description: {
      type: 'string',
      isNotEmptyString: true,
      allowNull: true,
    },
    dueDate: {
      type: 'string',
      custom: dueDateValidator,
      allowNull: true,
    },
    stopwatch: {
      type: 'json',
      custom: stopwatchValidator,
    },
    cardFields: {
      type: 'json',
      custom: cardFieldsValidator,
    },
    isSubscribed: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    boardNotFound: {
      responseType: 'notFound',
    },
    listNotFound: {
      responseType: 'notFound',
    },
    listMustBePresent: {
      responseType: 'unprocessableEntity',
    },
    positionMustBePresent: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const path = await sails.helpers.cards
      .getProjectPath(inputs.id)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    let { card } = path;
    const { list, board } = path;
    const prevCard = card;

    let boardMembership = await BoardMembership.findOne({
      boardId: board.id,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let nextBoard;
    if (!_.isUndefined(inputs.boardId)) {
      ({ board: nextBoard } = await sails.helpers.boards
        .getProjectPath(inputs.boardId)
        .intercept('pathNotFound', () => Errors.BOARD_NOT_FOUND));

      boardMembership = await BoardMembership.findOne({
        boardId: nextBoard.id,
        userId: currentUser.id,
      });

      if (!boardMembership) {
        throw Errors.BOARD_NOT_FOUND; // Forbidden
      }

      if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
        throw Errors.NOT_ENOUGH_RIGHTS;
      }
    }

    let nextList;
    if (!_.isUndefined(inputs.listId)) {
      nextList = await List.findOne({
        id: inputs.listId,
        boardId: (nextBoard || board).id,
      });

      if (!nextList) {
        throw Errors.LIST_NOT_FOUND; // Forbidden
      }
    }

    const values = _.pick(inputs, [
      'coverAttachmentId',
      'position',
      'name',
      'description',
      'cardFields',
      'dueDate',
      'stopwatch',
      'isSubscribed',
    ]);

    card = await sails.helpers.cards.updateOne
      .with({
        board,
        list,
        record: card,
        values: {
          ...values,
          board: nextBoard,
          list: nextList,
        },
        user: currentUser,
        request: this.req,
      })
      .intercept('positionMustBeInValues', () => Errors.POSITION_MUST_BE_PRESENT)
      .intercept('listMustBeInValues', () => Errors.LIST_MUST_BE_PRESENT);

    if (!card) {
      throw Errors.CARD_NOT_FOUND;
    }

    if (!_.isUndefined(values.description) || !_.isUndefined(values.cardFields)) {
      const notificationBoard = nextBoard || board;
      const boardMemberships = await sails.helpers.boards.getBoardMemberships(notificationBoard.id);
      const userIds = sails.helpers.utils.mapRecords(boardMemberships, 'userId');
      const users = await sails.helpers.users.getMany(userIds);

      if (!_.isUndefined(values.description) && values.description !== prevCard.description) {
        const mentionUserIds = await getNewMentionUserIds(
          values.description,
          prevCard.description,
          users,
        );

        if (mentionUserIds.length > 0) {
          await sails.helpers.actions.createOne.with({
            values: {
              card,
              user: currentUser,
              type: Action.Types.MENTION_CARD,
              data: {
                location: 'description',
                text: values.description,
              },
            },
            board: notificationBoard,
            request: this.req,
            notifyUserIds: mentionUserIds,
            withSubscriptions: false,
          });
        }
      }

      if (!_.isUndefined(values.cardFields) && !_.isNull(values.cardFields)) {
        const prevFields = _.keyBy(prevCard.cardFields || [], 'id');

        await Promise.all(
          values.cardFields.map(async (field) => {
            const prevFieldValue = prevFields[field.id] ? prevFields[field.id].value : null;

            if (field.value === prevFieldValue) {
              return;
            }

            const mentionUserIds = await getNewMentionUserIds(field.value, prevFieldValue, users);

            if (mentionUserIds.length === 0) {
              return;
            }

            await sails.helpers.actions.createOne.with({
              values: {
                card,
                user: currentUser,
                type: Action.Types.MENTION_CARD,
                data: {
                  location: 'field',
                  fieldId: field.id,
                  fieldName: field.name,
                  text: field.value,
                },
              },
              board: notificationBoard,
              request: this.req,
              notifyUserIds: mentionUserIds,
              withSubscriptions: false,
            });
          }),
        );
      }
    }

    return {
      item: card,
    };
  },
};
