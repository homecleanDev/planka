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
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
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

    let { card } = await sails.helpers.cards
      .getProjectPath(inputs.id)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    console.log('Card object:', card);

    const boardMembership = await BoardMembership.findOne({
      boardId: card.boardId,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    const board = await Board.findOne({ id: card.boardId });
    if (!board) {
      throw Errors.CARD_NOT_FOUND;
    }

    const project = await Project.findOne({ id: board.projectId });
    if (!project) {
      throw Errors.CARD_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager && !project.member_card_deletion_enabled) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    card = await sails.helpers.cards.deleteOne.with({
      record: card,
      user: currentUser,
      request: this.req,
    });

    if (!card) {
      throw Errors.CARD_NOT_FOUND;
    }

    return {
      item: card,
    };
  },
};
