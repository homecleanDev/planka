const Errors = {
  NOTIFICATION_NOT_FOUND: {
    notificationNotFound: 'Notification not found',
  },
};

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
  },

  exits: {
    notificationNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const notification = await Notification.findOne({
      id: inputs.id,
      isRead: false,
      userId: currentUser.id,
    });

    if (!notification) {
      throw Errors.NOTIFICATION_NOT_FOUND;
    }

    const action = await Action.findOne(notification.actionId);
    const user = await sails.helpers.users.getOne(action.userId, true);
    const card = await Card.findOne(notification.cardId);
    const cardMemberships = await sails.helpers.cards.getCardMemberships(card.id);
    const cardLabels = await sails.helpers.cards.getCardLabels(card.id);
    const tasks = await sails.helpers.cards.getTasks(card.id);
    const attachments = await sails.helpers.cards.getAttachments(card.id);

    return {
      item: notification,
      included: {
        users: [user],
        cards: [card],
        cardMemberships,
        cardLabels,
        tasks,
        attachments,
        actions: [action],
      },
    };
  },
};
