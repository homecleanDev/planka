const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
};

module.exports = {
  inputs: {
    cardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    position: {
      type: 'number',
      required: true,
    },
    name: {
      type: 'string',
      required: true,
    },
    isCompleted: {
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
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { board, card } = await sails.helpers.cards
      .getProjectPath(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const boardMembership = await BoardMembership.findOne({
      boardId: card.boardId,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, ['position', 'name', 'isCompleted']);

    const task = await sails.helpers.tasks.createOne.with({
      values: {
        ...values,
        card,
      },
      request: this.req,
    });

    if (task.name) {
      const boardMemberships = await sails.helpers.boards.getBoardMemberships(board.id);
      const userIds = sails.helpers.utils.mapRecords(boardMemberships, 'userId');
      const users = await sails.helpers.users.getMany(userIds);
      const mentionUserIds = _.uniq(
        (await sails.helpers.mentions.getMentions(task.name, users)).filter(Boolean),
      );

      if (mentionUserIds.length > 0) {
        await sails.helpers.actions.createOne.with({
          values: {
            card,
            user: currentUser,
            type: Action.Types.MENTION_CARD,
            data: {
              location: 'task',
              taskId: task.id,
              taskName: task.name,
              text: task.name,
            },
          },
          board,
          request: this.req,
          notifyUserIds: mentionUserIds,
          withSubscriptions: false,
        });
      }
    }

    return {
      item: task,
    };
  },
};
