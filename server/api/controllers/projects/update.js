const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
};

const backgroundValidator = (value) => {
  if (_.isNull(value)) {
    return true;
  }

  if (!_.isPlainObject(value)) {
    return false;
  }

  if (!Object.values(Project.BackgroundTypes).includes(value.type)) {
    return false;
  }

  if (
    value.type === Project.BackgroundTypes.GRADIENT &&
    _.size(value) === 2 &&
    Project.BACKGROUND_GRADIENTS.includes(value.name)
  ) {
    return true;
  }

  if (value.type === Project.BackgroundTypes.IMAGE && _.size(value) === 1) {
    return true;
  }

  return false;
};

const backgroundImageValidator = (value) => _.isNull(value);

const cardFieldsValidator = (value) => {
  if (_.isNull(value)) {
    return true;
  }

  if (!Array.isArray(value)) {
    return false;
  }

  return value.every(
    (field) =>
      _.isPlainObject(field) &&
      _.isString(field.id) &&
      field.id.length > 0 &&
      _.isString(field.name) &&
      field.name.trim().length > 0,
  );
};

const zohoWebhookTokenValidator = (value) =>
  _.isNull(value) || (_.isString(value) && value.trim().length > 0);

const zohoWebhookListIdValidator = (value) =>
  _.isNull(value) || (_.isString(value) && /^[0-9]+$/.test(value));

const zohoWebhookUserIdsValidator = (value) => {
  if (_.isNull(value)) {
    return true;
  }

  return (
    Array.isArray(value) && value.every((userId) => _.isString(userId) && /^[0-9]+$/.test(userId))
  );
};

const zohoWebhookCreatorUserIdValidator = (value) =>
  _.isNull(value) || (_.isString(value) && /^[0-9]+$/.test(value));

module.exports = {
  inputs: {
    id: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    name: {
      type: 'string',
      isNotEmptyString: true,
    },
    background: {
      type: 'json',
      custom: backgroundValidator,
    },
    backgroundImage: {
      type: 'json',
      custom: backgroundImageValidator,
    },
    member_card_deletion_enabled: {
      type: 'boolean',
      required: false,
    },
    cardFields: {
      type: 'json',
      custom: cardFieldsValidator,
    },
    zohoWebhookToken: {
      type: 'string',
      custom: zohoWebhookTokenValidator,
      allowNull: true,
    },
    zohoWebhookListId: {
      type: 'string',
      custom: zohoWebhookListIdValidator,
      allowNull: true,
    },
    zohoWebhookUserIds: {
      type: 'json',
      custom: zohoWebhookUserIdsValidator,
    },
    zohoWebhookCreatorUserId: {
      type: 'string',
      custom: zohoWebhookCreatorUserIdValidator,
      allowNull: true,
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    let project = await Project.findOne(inputs.id);

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);

    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    const hasZohoWebhookChange =
      !_.isUndefined(inputs.zohoWebhookToken) ||
      !_.isUndefined(inputs.zohoWebhookListId) ||
      !_.isUndefined(inputs.zohoWebhookUserIds) ||
      !_.isUndefined(inputs.zohoWebhookCreatorUserId);

    if (hasZohoWebhookChange && !currentUser.isAdmin) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    const values = _.pick(inputs, [
      'name',
      'background',
      'backgroundImage',
      'member_card_deletion_enabled',
      'cardFields',
      'zohoWebhookToken',
      'zohoWebhookListId',
      'zohoWebhookUserIds',
      'zohoWebhookCreatorUserId',
    ]);

    project = await sails.helpers.projects.updateOne.with({
      values,
      record: project,
      request: this.req,
    });

    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    return {
      item: project,
    };
  },
};
