const POSITION_GAP = 65535;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const { getDescriptionSource } = require('../../../utils/zohoWebhook');

const extractEmails = (...values) =>
  values
    .filter(_.isString)
    .reduce((result, value) => [...result, ...(value.match(EMAIL_REGEX) || [])], [])
    .map((email) => email.toLowerCase());

const getSenderEmail = (payload) => extractEmails(payload.fromAddress, payload.sender)[0] || null;

const buildLegacyWebhook = (project) => {
  if (!project.zohoWebhookToken || !project.zohoWebhookListId) {
    return null;
  }

  return {
    token: project.zohoWebhookToken,
    listId: project.zohoWebhookListId,
    userIds: Array.isArray(project.zohoWebhookUserIds) ? project.zohoWebhookUserIds : [],
    creatorUserId: project.zohoWebhookCreatorUserId || null,
  };
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
    const { source: descriptionSource, value: description } = getDescriptionSource(payload);

    console.log(
      '[Zoho webhook] payload:',
      JSON.stringify(payload, null, 2),
    );
    console.log('[Zoho webhook] description:', {
      source: descriptionSource,
      length: _.isString(description) ? description.length : 0,
      preview: _.isString(description) ? description.slice(0, 500) : null,
    });

    const legacyProject = await Project.findOne({
      zohoWebhookToken: inputs.token,
    });

    const projectsWithZohoWebhooks = await Project.find({
      zohoWebhooks: {
        '!=': null,
      },
    });

    const projectWithArrayWebhook = projectsWithZohoWebhooks.find(
      (item) =>
        Array.isArray(item.zohoWebhooks) &&
        item.zohoWebhooks.some((webhook) => webhook.token === inputs.token),
    );

    const project = projectWithArrayWebhook || legacyProject;

    if (!project) {
      return this.res.notFound();
    }

    const webhook =
      (Array.isArray(project.zohoWebhooks) &&
        project.zohoWebhooks.find((item) => item.token === inputs.token)) ||
      buildLegacyWebhook(project);

    if (!webhook || !webhook.listId) {
      return this.res.notFound();
    }

    const { list, board } = await sails.helpers.lists
      .getProjectPath({
        id: webhook.listId,
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

    if (!creatorUser && webhook.creatorUserId) {
      creatorUser = await sails.helpers.users.getOne({
        id: webhook.creatorUserId,
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
        description,
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

    const configuredUserIds = Array.isArray(webhook.userIds) ? webhook.userIds : [];

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
