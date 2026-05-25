const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  TASK_NOT_FOUND: {
    taskNotFound: 'Task not found',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    position: {
      type: 'number',
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
    },
    isCompleted: {
      type: 'boolean',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    taskNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const path = await sails.helpers.tasks
      .getProjectPath(inputs.id)
      .intercept('pathNotFound', () => Errors.TASK_NOT_FOUND);

    let { task } = path;
    const { board, card } = path;
    const prevTask = task;

    const boardMembership = await BoardMembership.findOne({
      boardId: board.id,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.TASK_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const values = _.pick(inputs, ['position', 'name', 'isCompleted']);

    task = await sails.helpers.tasks.updateOne.with({
      values,
      board,
      record: task,
      request: this.req,
    });

    if (!task) {
      throw Errors.TASK_NOT_FOUND;
    }

    if (!_.isUndefined(values.name) && values.name !== prevTask.name) {
      const boardMemberships = await sails.helpers.boards.getBoardMemberships(board.id);
      const userIds = sails.helpers.utils.mapRecords(boardMemberships, 'userId');
      const users = await sails.helpers.users.getMany(userIds);
      const nextMentions = values.name
        ? await sails.helpers.mentions.getMentions(values.name, users)
        : [];
      const prevMentions = prevTask.name
        ? await sails.helpers.mentions.getMentions(prevTask.name, users)
        : [];
      const mentionUserIds = _.difference(
        _.uniq(nextMentions.filter(Boolean)),
        _.uniq(prevMentions.filter(Boolean)),
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
              taskName: values.name,
              text: values.name,
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
