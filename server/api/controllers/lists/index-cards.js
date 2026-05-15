const Errors = {
  LIST_NOT_FOUND: {
    listNotFound: 'List not found',
  },
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    cursor: {
      type: 'number',
    },
    limit: {
      type: 'number',
      min: 1,
      max: MAX_LIMIT,
    },
    search: {
      type: 'string',
    },
  },

  exits: {
    listNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const { list } = await sails.helpers.lists
      .getProjectPath(inputs.id)
      .intercept('pathNotFound', () => Errors.LIST_NOT_FOUND);

    const isBoardMember = await sails.helpers.users.isBoardMember(currentUser.id, list.boardId);

    if (!isBoardMember) {
      throw Errors.LIST_NOT_FOUND; // Forbidden
    }

    const searchText = inputs.search ? inputs.search.trim() : '';
    let cards;

    if (searchText) {
      const normalizedSearchText = searchText.toLocaleLowerCase();
      const allListCards = await Card.find({
        listId: list.id,
      }).sort('position');

      cards = allListCards.filter((card) =>
        card.name ? card.name.toLocaleLowerCase().includes(normalizedSearchText) : false,
      );
    } else {
      const limit = inputs.limit || DEFAULT_LIMIT;

      const criteria = {
        listId: list.id,
        ...(inputs.cursor ? { position: { '>': inputs.cursor } } : {}),
      };

      cards = await sails.helpers.cards.getMany.with({
        criteria,
        limit,
      });
    }

    const cardIds = sails.helpers.utils.mapRecords(cards);

    const cardSubscriptions = await sails.helpers.cardSubscriptions.getMany({
      cardId: cardIds,
      userId: currentUser.id,
    });

    const cardMemberships = await sails.helpers.cards.getCardMemberships(cardIds);
    const cardLabels = await sails.helpers.cards.getCardLabels(cardIds);
    const tasks = await sails.helpers.cards.getTasks(cardIds);
    const attachments = await sails.helpers.cards.getAttachments(cardIds);

    const isSubscribedByCardId = cardSubscriptions.reduce(
      (result, cardSubscription) => ({
        ...result,
        [cardSubscription.cardId]: true,
      }),
      {},
    );

    cards.forEach((card) => {
      // eslint-disable-next-line no-param-reassign
      card.isSubscribed = isSubscribedByCardId[card.id] || false;
    });

    return {
      items: cards,
      included: {
        cardMemberships,
        cardLabels,
        tasks,
        attachments,
      },
    };
  },
};
