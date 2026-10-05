const POSITION_GAP = 65535;

const getPathValue = (payload, path) => {
  if (!_.isPlainObject(payload) || !_.isString(path)) {
    return undefined;
  }

  return path.split('.').reduce((value, part) => {
    if (_.isNil(value) || (!_.isPlainObject(value) && !Array.isArray(value))) {
      return undefined;
    }

    return value[part];
  }, payload);
};

const getPrettyValue = (payload, fieldName) => {
  if (!_.isString(payload.pretty) || !_.isString(fieldName)) {
    return undefined;
  }

  const entries = [...payload.pretty.matchAll(/(?:^|,\s*)([^:]+):([^,]*)(?=,\s*[^:]+:|$)/g)];
  const entry = entries.find(
    ([, label]) => label.trim().toLowerCase() === fieldName.trim().toLowerCase(),
  );

  return entry ? entry[2].trim() : undefined;
};

const getMappedValue = (payload, fieldName) => {
  const directValue = getPathValue(payload, fieldName);
  return _.isUndefined(directValue) ? getPrettyValue(payload, fieldName) : directValue;
};

const stringifyValue = (value) => {
  if (_.isNil(value)) {
    return '';
  }

  if (_.isString(value) || _.isNumber(value) || _.isBoolean(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(stringifyValue).filter(Boolean).join(', ');
  }

  return JSON.stringify(value);
};

const findProjectAndWebhook = async (token) => {
  const projects = await Project.find({
    genericWebhooks: {
      '!=': null,
    },
  });

  const match = projects
    .map((project) => ({
      project,
      webhook: Array.isArray(project.genericWebhooks)
        ? project.genericWebhooks.find((item) => item && item.token === token)
        : null,
    }))
    .find((item) => item.webhook);

  return match || null;
};

module.exports = {
  inputs: {
    token: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const receivedPayload = _.isNil(this.req.body) ? {} : this.req.body;
    const payload = _.isPlainObject(receivedPayload) ? receivedPayload : {};

    await WebhookLog.create({
      source: 'generic',
      token: inputs.token,
      payload: receivedPayload,
    }).tolerate(() => undefined);

    const result = await findProjectAndWebhook(inputs.token);
    if (!result) {
      return this.res.notFound();
    }

    const { project, webhook } = result;
    const listPath = await sails.helpers.lists.getProjectPath({ id: webhook.listId });
    const { list, board } = listPath || {};

    if (!list || !board || board.projectId !== project.id) {
      return this.res.notFound();
    }

    let creatorUser = webhook.creatorUserId
      ? await sails.helpers.users.getOne({ id: webhook.creatorUserId })
      : null;

    if (!creatorUser) {
      const [projectManager] = await ProjectManager.find({ projectId: project.id })
        .sort('createdAt ASC')
        .limit(1);

      if (projectManager) {
        creatorUser = await sails.helpers.users.getOne({ id: projectManager.userId });
      }
    }

    if (!creatorUser) {
      return this.res.serverError();
    }

    const title = stringifyValue(getMappedValue(payload, webhook.titleField)).trim() || 'Webhook';
    const description = (Array.isArray(webhook.descriptionFields) ? webhook.descriptionFields : [])
      .map((field) => stringifyValue(getMappedValue(payload, field)).trim())
      .filter(Boolean)
      .join('\n');

    const cards = await sails.helpers.lists.getCards(list.id);
    const lastCard = cards[cards.length - 1];
    const card = await sails.helpers.cards.createOne.with({
      board,
      values: {
        list,
        creatorUser,
        position: (lastCard ? lastCard.position : 0) + POSITION_GAP,
        name: title,
        description: description || null,
      },
      request: this.req,
    });

    const boardMemberships = await sails.helpers.boards.getBoardMemberships(board.id);
    const boardMemberUserIds = new Set(boardMemberships.map((membership) => membership.userId));
    const memberUserIds = [...new Set(webhook.userIds || [])].filter((userId) =>
      boardMemberUserIds.has(userId),
    );

    await Promise.all(
      memberUserIds.map((userId) =>
        sails.helpers.cardMemberships.createOne
          .with({ values: { card, userId }, request: this.req })
          .intercept('userAlreadyCardMember', () => undefined),
      ),
    );

    return {
      item: {
        id: card.id,
        mode: 'card',
      },
    };
  },
};
