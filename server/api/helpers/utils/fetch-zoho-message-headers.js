module.exports = {
  inputs: {
    baseUrl: {
      type: 'string',
      required: true,
    },
    accountId: {
      type: 'string',
      required: true,
    },
    oAuthToken: {
      type: 'string',
      required: true,
    },
    folderId: {
      type: 'string',
      required: true,
    },
    messageId: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const url = new URL(
      `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${inputs.messageId}/header`,
      inputs.baseUrl,
    );
    url.searchParams.set('raw', 'false');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Zoho-oauthtoken ${inputs.oAuthToken}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const body = await response.json();
    const headerContent = body && body.data ? body.data.headerContent : null;

    return _.isPlainObject(headerContent) ? headerContent : null;
  },
};
