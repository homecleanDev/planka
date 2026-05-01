const redirectWithStatus = (baseUrl, status, message) => {
  const target = new URL(baseUrl);
  target.searchParams.set('zohoConnect', status);

  if (message) {
    target.searchParams.set('zohoConnectMessage', message);
  }

  return target.toString();
};

module.exports = {
  inputs: {
    code: {
      type: 'string',
    },
    state: {
      type: 'string',
      required: true,
    },
    error: {
      type: 'string',
    },
    error_description: {
      type: 'string',
    },
  },

  async fn(inputs) {
    let state;
    try {
      const parsedState = sails.helpers.utils.verifyToken(inputs.state);
      state = parsedState.subject;
    } catch (error) {
      return this.res.redirect(
        redirectWithStatus(`${sails.config.custom.baseUrl}/`, 'error', 'invalid-state'),
      );
    }

    const safeReturnUrl =
      (_.isString(state.returnUrl) && state.returnUrl.trim()) || `${sails.config.custom.baseUrl}/`;

    if (inputs.error || !inputs.code) {
      return this.res.redirect(
        redirectWithStatus(
          safeReturnUrl,
          'error',
          inputs.error_description || inputs.error || 'missing-code',
        ),
      );
    }

    const project = await Project.findOne(state.projectId);
    if (!project) {
      return this.res.redirect(redirectWithStatus(safeReturnUrl, 'error', 'project-not-found'));
    }

    const user = await sails.helpers.users.getOne({
      id: state.userId,
    });
    const isProjectManager = user
      ? await sails.helpers.users.isProjectManager(user.id, project.id)
      : false;

    if (!user || !user.isAdmin || !isProjectManager) {
      return this.res.redirect(redirectWithStatus(safeReturnUrl, 'error', 'not-enough-rights'));
    }

    const tokenExchangeUrl = new URL(
      '/oauth/v2/token',
      sails.config.custom.zohoOauthAccountsBaseUrl,
    );

    tokenExchangeUrl.searchParams.set('grant_type', 'authorization_code');
    tokenExchangeUrl.searchParams.set('client_id', sails.config.custom.zohoOauthClientId);
    tokenExchangeUrl.searchParams.set('client_secret', sails.config.custom.zohoOauthClientSecret);
    tokenExchangeUrl.searchParams.set('redirect_uri', sails.config.custom.zohoOauthRedirectUri);
    tokenExchangeUrl.searchParams.set('code', inputs.code);

    const tokenExchangeResponse = await fetch(tokenExchangeUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!tokenExchangeResponse.ok) {
      return this.res.redirect(redirectWithStatus(safeReturnUrl, 'error', 'token-exchange-failed'));
    }

    const tokenBody = await tokenExchangeResponse.json();
    const accessToken = tokenBody.access_token;
    const refreshToken = tokenBody.refresh_token;
    const expiresIn = tokenBody.expires_in || tokenBody.expires_in_sec;

    if (!accessToken || !refreshToken) {
      return this.res.redirect(
        redirectWithStatus(safeReturnUrl, 'error', 'invalid-token-response'),
      );
    }

    const accountsResponse = await fetch(
      new URL('/api/accounts', sails.config.custom.zohoMailApiBaseUrl),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Zoho-oauthtoken ${accessToken}`,
        },
      },
    );

    if (!accountsResponse.ok) {
      return this.res.redirect(redirectWithStatus(safeReturnUrl, 'error', 'accounts-fetch-failed'));
    }

    const accountsBody = await accountsResponse.json();
    const account =
      Array.isArray(accountsBody.data) && accountsBody.data.length > 0
        ? accountsBody.data[0]
        : null;

    if (!account || !account.accountId) {
      return this.res.redirect(redirectWithStatus(safeReturnUrl, 'error', 'account-id-missing'));
    }

    const now = Date.now();
    const expiresAt = expiresIn ? new Date(now + Number(expiresIn) * 1000).toISOString() : null;

    await sails.helpers.projects.updateOne.with({
      record: project,
      values: {
        zohoConnection: {
          accountId: String(account.accountId),
          accessToken,
          refreshToken,
          accessTokenExpiresAt: expiresAt,
          connectedByUserId: state.userId,
          connectedAt: new Date(now).toISOString(),
        },
      },
      request: this.req,
    });

    return this.res.redirect(redirectWithStatus(safeReturnUrl, 'success'));
  },
};
