module.exports = {
  async fn() {
    const { currentUser } = this.req;
    const LIMIT = 100;

    const notifications = await sails.helpers.users.getNotifications.with({
      idOrIds: currentUser.id,
      limit: LIMIT,
    });

    const actionIds = sails.helpers.utils.mapRecords(notifications, 'actionId');
    const actions = await sails.helpers.actions.getMany(actionIds);

    const userIds = sails.helpers.utils.mapRecords(actions, 'userId', true);
    const users = await sails.helpers.users.getMany(userIds, true);

    const cardIds = sails.helpers.utils.mapRecords(notifications, 'cardId', true);
    const cards = await sails.helpers.cards.getMany(cardIds);
    const cardMemberships = await sails.helpers.cards.getCardMemberships(cardIds);
    const cardLabels = await sails.helpers.cards.getCardLabels(cardIds);
    const tasks = await sails.helpers.cards.getTasks(cardIds);
    const attachments = await sails.helpers.cards.getAttachments(cardIds);

    return {
      items: notifications,
      included: {
        users,
        cards,
        cardMemberships,
        cardLabels,
        tasks,
        attachments,
        actions,
      },
    };
  },
};
