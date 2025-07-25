const valuesValidator = (value) => {
  if (!_.isPlainObject(value)) {
    return false;
  }

  if (!_.isUndefined(value.position) && !_.isFinite(value.position)) {
    return false;
  }

  if (!_.isPlainObject(value.creatorUser)) {
    return false;
  }

  return true;
};

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    values: {
      type: 'ref',
      custom: valuesValidator,
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    list: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const { values } = inputs;

    const cards = await sails.helpers.lists.getCards(inputs.record.listId);

    const { position, repositions } = sails.helpers.utils.insertToPositionables(
      values.position,
      cards,
    );

    repositions.forEach(async ({ id, position: nextPosition }) => {
      await Card.update({
        id,
        listId: inputs.record.listId,
      }).set({
        position: nextPosition,
      });

      sails.sockets.broadcast(`board:${inputs.record.boardId}`, 'cardUpdate', {
        item: {
          id,
          position: nextPosition,
        },
      });
    });

    const card = await Card.create({
      ..._.pick(inputs.record, [
        'boardId',
        'listId',
        'name',
        'description',
        'dueDate',
        'stopwatch',
      ]),
      ...values,
      position,
      creatorUserId: values.creatorUser.id,
    }).fetch();

    const cardMemberships = await sails.helpers.cards.getCardMemberships(inputs.record.id);
    const cardMembershipsValues = cardMemberships.map((cardMembership) => ({
      ..._.pick(cardMembership, ['userId']),
      cardId: card.id,
    }));
    const nextCardMemberships = await CardMembership.createEach(cardMembershipsValues).fetch();

    const cardLabels = await sails.helpers.cards.getCardLabels(inputs.record.id);
    const cardLabelsValues = cardLabels.map((cardLabel) => ({
      ..._.pick(cardLabel, ['labelId']),
      cardId: card.id,
    }));
    const nextCardLabels = await CardLabel.createEach(cardLabelsValues).fetch();

    const tasks = await sails.helpers.cards.getTasks(inputs.record.id);
    const tasksValues = tasks.map((task) => ({
      ..._.pick(task, ['position', 'name', 'isCompleted']),
      cardId: card.id,
    }));
    const nextTasks = await Task.createEach(tasksValues).fetch();

    // Duplicate comments
    const comments = await sails.helpers.cards.getActions(inputs.record.id, undefined, true);
    const commentActions = comments
      .filter(action => action.type === Action.Types.COMMENT_CARD)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const nextComments = await Promise.all(
      commentActions.map(async (comment) => {
        return Action.create({
          cardId: card.id,
          userId: comment.userId,
          type: Action.Types.COMMENT_CARD,
          data: {
            text: comment.data.text,
          },
        }).fetch();
      })
    );

    // Duplicate attachments
    const attachments = await sails.helpers.cards.getAttachments(inputs.record.id);
    const nextAttachments = await Promise.all(
      attachments.map(async (attachment) => {
        return Attachment.create({
          cardId: card.id,
          creatorUserId: values.creatorUser.id,
          name: attachment.name,
          path: attachment.path,
          image: attachment.image,
        }).fetch();
      })
    );

    sails.sockets.broadcast(
      `board:${card.boardId}`,
      'cardCreate',
      {
        item: card,
      },
      inputs.request,
    );

    if (values.creatorUser.subscribeToOwnCards) {
      await CardSubscription.create({
        cardId: card.id,
        userId: card.creatorUserId,
      }).tolerate('E_UNIQUE');

      sails.sockets.broadcast(`user:${card.creatorUserId}`, 'cardUpdate', {
        item: {
          id: card.id,
          isSubscribed: true,
        },
      });
    }

    await sails.helpers.actions.createOne.with({
      values: {
        card,
        type: Action.Types.CREATE_CARD, // TODO: introduce separate type?
        data: {
          list: _.pick(inputs.list, ['id', 'name']),
        },
        user: values.creatorUser,
      },
      board: inputs.board,
    });

    return {
      card,
      cardMemberships: nextCardMemberships,
      cardLabels: nextCardLabels,
      tasks: nextTasks,
      comments: nextComments,
      attachments: nextAttachments,
    };
  },
};
