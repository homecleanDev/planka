const MAX_RESULTS = 20;

module.exports = {
  inputs: {
    q: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const searchText = inputs.q.trim().toLocaleLowerCase();

    if (!searchText) {
      return { items: [] };
    }

    sails.log.info('[cards/search] User:', currentUser.id, '| Query:', searchText);

    // ── 1. Collect all board IDs the current user can see ──────────────────────
    // Pattern mirrors projects/index.js: managers see all boards in their projects,
    // non-managers see only boards they are a member of.

    const managerProjectIds = await sails.helpers.users.getManagerProjectIds(currentUser.id);
    sails.log.info('[cards/search] Manager project IDs:', managerProjectIds);

    let managerBoardIds = [];
    if (managerProjectIds.length > 0) {
      const managerBoards = await sails.helpers.projects.getBoards(managerProjectIds);
      managerBoardIds = sails.helpers.utils.mapRecords(managerBoards);
    }

    const boardMemberships = await sails.helpers.users.getBoardMemberships(currentUser.id);
    const membershipBoardIds = sails.helpers.utils.mapRecords(boardMemberships, 'boardId');

    sails.log.info('[cards/search] Manager board IDs:', managerBoardIds);
    sails.log.info('[cards/search] Membership board IDs:', membershipBoardIds);

    const accessibleBoardIds = _.uniq([...managerBoardIds, ...membershipBoardIds]);

    if (accessibleBoardIds.length === 0) {
      sails.log.info('[cards/search] No accessible boards — returning empty');
      return { items: [] };
    }

    sails.log.info('[cards/search] Accessible board count:', accessibleBoardIds.length);

    // ── 2. Fetch all cards across those boards ─────────────────────────────────
    const cards = await Card.find({ boardId: accessibleBoardIds }).sort('position ASC');
    sails.log.info('[cards/search] Total cards across boards:', cards.length);

    if (cards.length === 0) {
      return { items: [] };
    }

    // ── 3. Fetch supporting data (tasks, boards, lists, projects) ──────────────
    const cardIds = sails.helpers.utils.mapRecords(cards);
    const tasks = await sails.helpers.cards.getTasks(cardIds);
    const lists = await sails.helpers.boards.getLists(accessibleBoardIds);
    const boards = await Board.find({ id: accessibleBoardIds });
    const projectIds = _.uniq(_.map(boards, 'projectId'));
    const projects = projectIds.length > 0 ? await Project.find({ id: projectIds }) : [];

    const boardById = _.keyBy(boards, 'id');
    const listById = _.keyBy(lists, 'id');
    const projectById = _.keyBy(projects, 'id');

    const taskNamesByCardId = tasks.reduce((result, task) => {
      if (!result[task.cardId]) {
        result[task.cardId] = [];
      }
      result[task.cardId].push(task.name || '');
      return result;
    }, {});

    // ── 4. Filter ──────────────────────────────────────────────────────────────
    const matchedCards = cards
      .filter((card) => {
        const taskNames = taskNamesByCardId[card.id] || [];

        // Guard against non-array cardFields (e.g. legacy null or object values)
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
      .map((card) => {
        const board = boardById[card.boardId];
        const list = listById[card.listId];
        const project = board ? projectById[board.projectId] : null;
        return {
          id: card.id,
          name: card.name,
          boardId: card.boardId,
          boardName: board ? board.name : null,
          listId: card.listId,
          listName: list ? list.name : null,
          projectId: board ? board.projectId : null,
          projectName: project ? project.name : null,
        };
      });

    sails.log.info('[cards/search] Matched cards:', matchedCards.length);

    return { items: matchedCards };
  },
};
