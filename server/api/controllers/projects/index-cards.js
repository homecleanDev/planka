const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
};

const MAX_RESULTS = 20;

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    search: {
      type: 'string',
      required: true,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.findOne(inputs.id);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const searchText = inputs.search.trim().toLocaleLowerCase();

    if (!searchText) {
      return {
        items: [],
      };
    }

    let boards = await sails.helpers.projects.getBoards(project.id);
    let boardIds = sails.helpers.utils.mapRecords(boards);

    const boardMemberships = await sails.helpers.boardMemberships.getMany({
      boardId: boardIds,
      userId: currentUser.id,
    });

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      if (boardMemberships.length === 0) {
        throw Errors.PROJECT_NOT_FOUND; // Forbidden
      }

      boardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');
      boards = boards.filter((board) => boardIds.includes(board.id));
    }

    const cards = await Card.find({
      boardId: boardIds,
    }).sort('position ASC');

    const cardIds = sails.helpers.utils.mapRecords(cards);
    const tasks = cardIds.length > 0 ? await sails.helpers.cards.getTasks(cardIds) : [];
    const lists = boardIds.length > 0 ? await sails.helpers.boards.getLists(boardIds) : [];

    const boardById = _.keyBy(boards, 'id');
    const listById = _.keyBy(lists, 'id');
    const taskNamesByCardId = tasks.reduce((result, task) => {
      if (!result[task.cardId]) {
        result[task.cardId] = [];
      }

      result[task.cardId].push(task.name || '');

      return result;
    }, {});

    const matchedCards = cards
      .filter((card) => {
        const taskNames = taskNamesByCardId[card.id] || [];
        const cardFieldTexts = Array.isArray(card.cardFields)
          ? card.cardFields.flatMap((field) => [field.name, field.value].filter(Boolean))
          : [];
        const haystack = [card.name, card.description, ...taskNames, ...cardFieldTexts]
          .filter(Boolean)
          .join('\n')
          .toLocaleLowerCase();

        return haystack.includes(searchText);
      })
      .slice(0, MAX_RESULTS)
      .map((card) => ({
        id: card.id,
        name: card.name,
        boardId: card.boardId,
        boardName: boardById[card.boardId] ? boardById[card.boardId].name : null,
        listId: card.listId,
        listName: listById[card.listId] ? listById[card.listId].name : null,
      }));

    return {
      items: matchedCards,
    };
  },
};
