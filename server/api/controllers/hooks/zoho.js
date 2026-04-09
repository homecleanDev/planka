const POSITION_GAP = 65535;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const extractEmails = (...values) =>
  values
    .filter(_.isString)
    .reduce((result, value) => [...result, ...(value.match(EMAIL_REGEX) || [])], [])
    .map((email) => email.toLowerCase());

const getSenderEmail = (payload) => extractEmails(payload.fromAddress, payload.sender)[0] || null;

const getDescription = (payload) => {
  if (_.isString(payload.summary) && payload.summary.trim()) {
    return payload.summary.trim();
  }

  if (_.isString(payload.html) && payload.html.trim()) {
    return payload.html.trim();
  }

  return null;
};

module.exports = {
  inputs: {
    token: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const payload = _.isPlainObject(this.req.body) ? this.req.body : {};

    const project = await Project.findOne({
      zohoWebhookToken: inputs.token,
    });

    if (!project || !project.zohoWebhookListId) {
      return this.res.notFound();
    }

    const { list, board } = await sails.helpers.lists
      .getProjectPath({
        id: project.zohoWebhookListId,
      })
      .intercept('pathNotFound', () => null);

    if (!list || !board || board.projectId !== project.id) {
      return this.res.notFound();
    }

    const senderEmail = getSenderEmail(payload);

    let creatorUser = senderEmail
      ? await sails.helpers.users.getOne({
          email: senderEmail,
        })
      : null;

    if (!creatorUser && project.zohoWebhookCreatorUserId) {
      creatorUser = await sails.helpers.users.getOne({
        id: project.zohoWebhookCreatorUserId,
      });
    }

    if (!creatorUser) {
      const [projectManager] = await ProjectManager.find({
        projectId: project.id,
      })
        .sort('createdAt ASC')
        .limit(1);

      if (projectManager) {
        creatorUser = await sails.helpers.users.getOne({
          id: projectManager.userId,
        });
      }
    }

    if (!creatorUser) {
      return this.res.serverError();
    }

    const cards = await sails.helpers.lists.getCards(list.id);
    const lastCard = cards[cards.length - 1];

    const card = await sails.helpers.cards.createOne.with({
      board,
      values: {
        list,
        creatorUser,
        position: (lastCard ? lastCard.position : 0) + POSITION_GAP,
        name: (_.isString(payload.subject) && payload.subject.trim()) || 'Zoho Email',
        description: getDescription(payload),
      },
      request: this.req,
    });

    const boardMemberships = await sails.helpers.boards.getBoardMemberships(board.id);
    const boardMemberUserIds = new Set(boardMemberships.map((membership) => membership.userId));

    const matchedEmails = extractEmails(
      payload.fromAddress,
      payload.toAddress,
      payload.ccAddress,
      payload.sender,
      payload.recipients,
    );

    const matchedEmailUserIds =
      matchedEmails.length > 0
        ? (
            await sails.helpers.users.getMany({
              email: matchedEmails,
            })
          ).map((user) => user.id)
        : [];

    const configuredUserIds = Array.isArray(project.zohoWebhookUserIds)
      ? project.zohoWebhookUserIds
      : [];

    const memberUserIds = [...new Set([...configuredUserIds, ...matchedEmailUserIds])].filter(
      (userId) => boardMemberUserIds.has(userId),
    );

    await Promise.all(
      memberUserIds.map((userId) =>
        sails.helpers.cardMemberships.createOne
          .with({
            values: {
              card,
              userId,
            },
            request: this.req,
          })
          .intercept('userAlreadyCardMember', () => undefined),
      ),
    );

    return {
      item: {
        id: card.id,
      },
    };
  },
};
