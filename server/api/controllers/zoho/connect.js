const Errors = {
  PROJECT_NOT_FOUND: {
    projectNotFound: 'Project not found',
  },
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
};

module.exports = {
  inputs: {
    projectId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    returnUrl: {
      type: 'string',
    },
  },

  exits: {
    projectNotFound: {
      responseType: 'notFound',
    },
    notEnoughRights: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const { currentUser } = this.req;

    const project = await Project.findOne(inputs.projectId);
    if (!project) {
      throw Errors.PROJECT_NOT_FOUND;
    }

    const isProjectManager = await sails.helpers.users.isProjectManager(currentUser.id, project.id);
    if (!isProjectManager) {
      throw Errors.PROJECT_NOT_FOUND; // Forbidden
    }

    if (!currentUser.isAdmin) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    const state = sails.helpers.utils.createToken({
      userId: currentUser.id,
      projectId: project.id,
      returnUrl:
        (_.isString(inputs.returnUrl) && inputs.returnUrl.trim()) ||
        `${sails.config.custom.baseUrl}/`,
    });

    const authorizationUrl = new URL(
      '/oauth/v2/auth',
      sails.config.custom.zohoOauthAccountsBaseUrl,
    );

    authorizationUrl.searchParams.set('scope', sails.config.custom.zohoOauthScope);
    authorizationUrl.searchParams.set('client_id', sails.config.custom.zohoOauthClientId);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('access_type', 'offline');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('redirect_uri', sails.config.custom.zohoOauthRedirectUri);
    authorizationUrl.searchParams.set('state', state);

    return {
      item: {
        authUrl: authorizationUrl.toString(),
      },
    };
  },
};
