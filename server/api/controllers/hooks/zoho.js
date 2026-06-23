const POSITION_GAP = 65535;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const {
  getDescriptionSource,
  getReplyDescriptionSource,
  getThreadMessageIds,
  replaceInlineImagePlaceholders,
} = require('../../../utils/zohoWebhook');

const extractEmails = (...values) =>
  values
    .filter(_.isString)
    .reduce((result, value) => [...result, ...(value.match(EMAIL_REGEX) || [])], [])
    .map((email) => email.toLowerCase());

const getSenderEmail = (payload) => extractEmails(payload.fromAddress, payload.sender)[0] || null;

const getZohoAccountEmails = (account) =>
  extractEmails(
    account.mailboxAddress,
    account.primaryEmailAddress,
    account.incomingUserName,
    ...(Array.isArray(account.emailAddress) ? account.emailAddress : []),
  );

const getZohoConnectionItems = (zohoConnection) => {
  if (!_.isPlainObject(zohoConnection)) {
    return [];
  }

  if (Array.isArray(zohoConnection.connections)) {
    return zohoConnection.connections.filter(_.isPlainObject);
  }

  return [zohoConnection];
};

const getZohoConnectionAccounts = (connection) => {
  const accounts =
    Array.isArray(connection.accounts) && connection.accounts.length > 0 ? connection.accounts : [];

  if (
    connection.accountId &&
    !accounts.some((account) => account.accountId === connection.accountId)
  ) {
    return [
      {
        accountId: connection.accountId,
      },
      ...accounts,
    ];
  }

  return accounts;
};

const getZohoAccountPriority = (account, payload) => {
  const payloadZuid =
    (_.isFinite(payload.zuid) || _.isString(payload.zuid)) && String(payload.zuid).trim()
      ? String(payload.zuid).trim()
      : null;

  if (
    payloadZuid &&
    !_.isUndefined(account.zuid) &&
    !_.isNull(account.zuid) &&
    String(account.zuid) === payloadZuid
  ) {
    return 0;
  }

  const payloadEmails = extractEmails(payload.toAddress, payload.ccAddress, payload.recipients);
  if (
    payloadEmails.length > 0 &&
    getZohoAccountEmails(account).some((email) => payloadEmails.includes(email))
  ) {
    return 1;
  }

  return 2;
};

const buildZohoAccountContexts = (zohoConnection, payload) => {
  const contexts = [];

  getZohoConnectionItems(zohoConnection).forEach((connection, connectionIndex) => {
    getZohoConnectionAccounts(connection).forEach((account) => {
      if (!(account && account.accountId)) {
        return;
      }

      contexts.push({
        connection,
        connectionIndex,
        account,
        accountId: account.accountId,
        accessToken: connection.accessToken,
        refreshToken: connection.refreshToken,
        accessTokenExpiresAt: connection.accessTokenExpiresAt,
        priority: getZohoAccountPriority(account, payload),
      });
    });
  });

  if (sails.config.custom.zohoMailAccountId && sails.config.custom.zohoMailOAuthToken) {
    contexts.push({
      connection: null,
      connectionIndex: -1,
      account: {
        accountId: sails.config.custom.zohoMailAccountId,
      },
      accountId: sails.config.custom.zohoMailAccountId,
      accessToken: sails.config.custom.zohoMailOAuthToken,
      refreshToken: null,
      accessTokenExpiresAt: null,
      priority: 3,
    });
  }

  return contexts
    .filter(
      (context, index, arr) =>
        arr.findIndex(
          (item) =>
            item.accountId === context.accountId &&
            item.accessToken === context.accessToken &&
            item.refreshToken === context.refreshToken,
        ) === index,
    )
    .sort((a, b) => a.priority - b.priority);
};

const buildZohoConnectionFromItems = (connections) => {
  const [primaryConnection] = connections;

  if (!primaryConnection) {
    return null;
  }

  return {
    ...primaryConnection,
    connections,
  };
};

const updateZohoConnectionItem = (zohoConnection, connectionIndex, nextConnection) => {
  const connections = getZohoConnectionItems(zohoConnection);

  if (connections.length === 0 || connectionIndex < 0) {
    return zohoConnection;
  }

  const nextConnections = connections.map((connection, index) =>
    index === connectionIndex ? nextConnection : connection,
  );

  return Array.isArray(zohoConnection.connections)
    ? {
        ...zohoConnection,
        connections: nextConnections,
      }
    : buildZohoConnectionFromItems(nextConnections);
};

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

const isZohoTestPayload = (payload) => {
  const normalizedSubject = _.isString(payload.subject) ? payload.subject.trim().toLowerCase() : '';
  const normalizedSummary = _.isString(payload.summary) ? payload.summary.trim().toLowerCase() : '';
  const normalizedHtml = _.isString(payload.html) ? payload.html.trim().toLowerCase() : '';
  const normalizedSender = _.isString(payload.sender) ? payload.sender.trim().toLowerCase() : '';
  const normalizedFromAddress = _.isString(payload.fromAddress)
    ? payload.fromAddress.trim().toLowerCase()
    : '';

  return (
    normalizedSubject === 'subject' &&
    normalizedSummary === 'sample summary' &&
    normalizedHtml === 'sample html content' &&
    normalizedSender === 'sample sender' &&
    normalizedFromAddress === 'sample@zylker.com'
  );
};
const getPayloadMessageId = (payload) => {
  if (_.isString(payload.messageIdString) && payload.messageIdString.trim()) {
    return payload.messageIdString.trim();
  }

  if (_.isFinite(payload.messageId)) {
    return String(payload.messageId);
  }

  if (_.isString(payload.messageId) && payload.messageId.trim()) {
    return payload.messageId.trim();
  }

  return null;
};

const saveMessageIds = async (projectId, cardId, messageIds) =>
  Promise.all(
    messageIds.map((externalMessageId) =>
      ZohoWebhookMessage.create({
        projectId,
        cardId,
        externalMessageId,
      }).tolerate('E_UNIQUE'),
    ),
  );

const saveWebhookLog = async (token, payload) => {
  try {
    await WebhookLog.create({
      source: 'zoho',
      token,
      payload,
    });
  } catch (error) {
    sails.log.warn('Unable to save webhook log', error.message);
  }
};

const getAttachmentPublicUrl = (fileData) =>
  `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${fileData.url}`;

const buildInlineImageReplacements = (fileDataItems) =>
  fileDataItems.reduce((result, fileData) => {
    const inlineContentIds = Array.isArray(fileData.inlineContentIdCandidates)
      ? fileData.inlineContentIdCandidates
      : [];

    inlineContentIds.forEach((contentId) => {
      // eslint-disable-next-line no-param-reassign
      result[contentId] = getAttachmentPublicUrl(fileData);
    });

    return result;
  }, {});

const getPathOrNull = async (deferred) => {
  try {
    return await deferred;
  } catch (error) {
    if (error === 'pathNotFound' || (error && error.code === 'pathNotFound')) {
      return null;
    }

    throw error;
  }
};

const importZohoAttachments = async ({
  project,
  card,
  creatorUser,
  payload,
  zohoContexts,
  folderId,
  messageId,
  request,
}) => {
  const contexts = Array.isArray(zohoContexts) ? zohoContexts : [];

  if (!(contexts.length > 0 && folderId && messageId)) {
    sails.log.info(
      'PlankaZoho:attachment import-skipped',
      JSON.stringify({
        zohoContextCount: contexts.length,
        hasFolderId: !!folderId,
        hasMessageId: !!messageId,
      }),
    );

    return {
      uploadedAttachments: [],
      inlineImageReplacements: {},
    };
  }

  sails.log.info(
    'PlankaZoho:attachment import-start',
    JSON.stringify({
      projectId: project.id,
      cardId: card.id,
      folderId,
      messageId,
      hasAttachment: payload.hasAttachment,
      zohoContextCount: contexts.length,
    }),
  );

  const fetchAttachmentsFromContext = async (index = 0) => {
    const context = contexts[index];

    if (!context) {
      return {
        uploadedAttachments: [],
        successfulContext: null,
      };
    }

    if (!(context.accountId && context.accessToken)) {
      sails.log.info(
        'PlankaZoho:attachment account-skipped',
        JSON.stringify({
          accountId: context.accountId || null,
          hasAccessToken: !!context.accessToken,
        }),
      );

      return fetchAttachmentsFromContext(index + 1);
    }

    sails.log.info(
      'PlankaZoho:attachment account-attempt',
      JSON.stringify({
        accountId: context.accountId,
        priority: context.priority,
      }),
    );

    try {
      const uploadedAttachments = await sails.helpers.utils.fetchZohoMessageAttachments.with({
        baseUrl: sails.config.custom.zohoMailApiBaseUrl,
        accountId: context.accountId,
        oAuthToken: context.accessToken,
        folderId,
        messageId,
        payload,
      });

      if (uploadedAttachments.length > 0) {
        return {
          uploadedAttachments,
          successfulContext: context,
        };
      }

      sails.log.info(
        'PlankaZoho:attachment account-empty',
        JSON.stringify({
          accountId: context.accountId,
        }),
      );
    } catch (error) {
      sails.log.warn(
        'PlankaZoho:attachment account-error',
        JSON.stringify({
          accountId: context.accountId,
          error: error.message,
        }),
      );
    }

    return fetchAttachmentsFromContext(index + 1);
  };

  const { uploadedAttachments, successfulContext } = await fetchAttachmentsFromContext();

  await Promise.all(
    uploadedAttachments.map((fileData) =>
      sails.helpers.attachments.createOne.with({
        values: {
          ...fileData,
          card,
          creatorUser,
        },
        request,
      }),
    ),
  );

  sails.log.info(
    'PlankaZoho:attachment card-attachments-created',
    JSON.stringify({
      projectId: project.id,
      cardId: card.id,
      count: uploadedAttachments.length,
      accountId: successfulContext ? successfulContext.accountId : null,
    }),
  );

  return {
    uploadedAttachments,
    inlineImageReplacements: buildInlineImageReplacements(uploadedAttachments),
  };
};

const refreshZohoAccessToken = async (refreshToken) => {
  const refreshUrl = new URL('/oauth/v2/token', sails.config.custom.zohoOauthAccountsBaseUrl);

  refreshUrl.searchParams.set('grant_type', 'refresh_token');
  refreshUrl.searchParams.set('refresh_token', refreshToken);
  refreshUrl.searchParams.set('client_id', sails.config.custom.zohoOauthClientId);
  refreshUrl.searchParams.set('client_secret', sails.config.custom.zohoOauthClientSecret);

  const response = await fetch(refreshUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const body = await response.json();
  const accessToken = body.access_token;
  const expiresIn = body.expires_in || body.expires_in_sec;

  if (!accessToken) {
    return null;
  }

  return {
    accessToken,
    expiresAt: expiresIn ? new Date(Date.now() + Number(expiresIn) * 1000).toISOString() : null,
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
    const receivedPayload = _.isNil(this.req.body) ? {} : this.req.body;
    const payload = _.isPlainObject(receivedPayload) ? receivedPayload : {};

    await saveWebhookLog(inputs.token, receivedPayload);

    if (isZohoTestPayload(payload)) {
      return {
        item: {
          skipped: true,
          reason: 'zoho-test-payload',
        },
      };
    }

    const { value: rawDescription } = getDescriptionSource(payload);
    const description =
      _.isString(rawDescription) && rawDescription.trim().length === 0 ? null : rawDescription;
    const { value: rawReplyDescription } = getReplyDescriptionSource(payload);
    const replyDescription =
      _.isString(rawReplyDescription) && rawReplyDescription.trim().length === 0
        ? null
        : rawReplyDescription;

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

    const listPath = await getPathOrNull(
      sails.helpers.lists.getProjectPath({
        id: webhook.listId,
      }),
    );
    const { list, board } = listPath || {};

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

    const folderId =
      _.isFinite(payload.folderId) || _.isString(payload.folderId)
        ? String(payload.folderId)
        : null;
    const messageId = getPayloadMessageId(payload);

    const projectZohoConnection = _.isPlainObject(project.zohoConnection)
      ? project.zohoConnection
      : null;
    let zohoContexts = buildZohoAccountContexts(projectZohoConnection, payload);

    sails.log.info(
      'PlankaZoho:attachment account-select',
      JSON.stringify({
        projectId: project.id,
        payloadZuid:
          (_.isFinite(payload.zuid) || _.isString(payload.zuid)) && String(payload.zuid).trim()
            ? String(payload.zuid).trim()
            : null,
        accountIds: zohoContexts.map((context) => context.accountId),
        connectedAccountCount: zohoContexts.filter((context) => context.connection).length,
      }),
    );

    const refreshZohoContext = async (index = 0) => {
      const context = zohoContexts[index];

      if (!context) {
        return;
      }

      const isZohoAccessTokenExpired =
        context.accessTokenExpiresAt &&
        new Date(context.accessTokenExpiresAt).getTime() <= Date.now() + 60 * 1000;

      if ((context.accessToken && !isZohoAccessTokenExpired) || !context.refreshToken) {
        await refreshZohoContext(index + 1);
        return;
      }

      const refreshedToken = await refreshZohoAccessToken(context.refreshToken);

      if (refreshedToken) {
        context.accessToken = refreshedToken.accessToken;
        context.accessTokenExpiresAt = refreshedToken.expiresAt;

        if (projectZohoConnection && context.connection) {
          const nextConnection = {
            ...context.connection,
            accessToken: refreshedToken.accessToken,
            accessTokenExpiresAt: refreshedToken.expiresAt,
          };
          const nextZohoConnection = updateZohoConnectionItem(
            project.zohoConnection,
            context.connectionIndex,
            nextConnection,
          );

          const updatedProject = await sails.helpers.projects.updateOne.with({
            record: project,
            values: {
              zohoConnection: nextZohoConnection,
            },
            request: this.req,
          });

          if (updatedProject) {
            project.zohoConnection = nextZohoConnection;
            context.connection = nextConnection;
          }
        }
      }

      await refreshZohoContext(index + 1);
    };

    await refreshZohoContext();

    zohoContexts = zohoContexts.filter((context) => context.accountId && context.accessToken);

    const fetchHeaderContent = async (index = 0) => {
      const context = zohoContexts[index];

      if (!context || !(folderId && messageId)) {
        return null;
      }

      try {
        return await sails.helpers.utils.fetchZohoMessageHeaders.with({
          baseUrl: sails.config.custom.zohoMailApiBaseUrl,
          accountId: context.accountId,
          oAuthToken: context.accessToken,
          folderId,
          messageId,
        });
      } catch (error) {
        sails.log.warn(
          'Unable to fetch Zoho message headers',
          JSON.stringify({
            accountId: context.accountId,
            error: error.message,
          }),
        );
      }

      return fetchHeaderContent(index + 1);
    };

    const headerContent = await fetchHeaderContent();

    const { currentMessageIds, parentMessageIds, isReply } = getThreadMessageIds(
      payload,
      headerContent,
    );

    if (isReply && parentMessageIds.length > 0) {
      const links = await ZohoWebhookMessage.find({
        projectId: project.id,
        externalMessageId: {
          in: parentMessageIds,
        },
      }).sort('createdAt DESC');

      if (links.length > 0) {
        const replyPath = await getPathOrNull(
          sails.helpers.cards.getProjectPath({
            id: links[0].cardId,
          }),
        );
        const { card, board: replyBoard, project: replyProject } = replyPath || {};

        if (card && replyBoard && replyProject && replyProject.id === project.id) {
          const commentText = replyDescription || '(No content)';

          const action = await sails.helpers.actions.createOne.with({
            board: replyBoard,
            values: {
              type: Action.Types.COMMENT_CARD,
              data: {
                text: commentText,
              },
              card,
              user: creatorUser,
            },
            request: this.req,
          });

          try {
            const { inlineImageReplacements } = await importZohoAttachments({
              project,
              card,
              creatorUser,
              payload,
              zohoContexts,
              folderId,
              messageId,
              request: this.req,
            });

            const nextCommentText = replaceInlineImagePlaceholders(
              commentText,
              inlineImageReplacements,
            );

            if (nextCommentText !== commentText) {
              await sails.helpers.actions.updateOne.with({
                record: action,
                values: {
                  data: {
                    ...action.data,
                    text: nextCommentText,
                  },
                },
                board: replyBoard,
                request: this.req,
              });
            }
          } catch (error) {
            sails.log.warn('PlankaZoho:attachment import-error', error.message);
          }

          if (currentMessageIds.length > 0) {
            await saveMessageIds(project.id, card.id, currentMessageIds);
          }

          return {
            item: {
              id: card.id,
              mode: 'comment',
            },
          };
        }
      }
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

    try {
      const { inlineImageReplacements } = await importZohoAttachments({
        project,
        card,
        creatorUser,
        payload,
        zohoContexts,
        folderId,
        messageId,
        request: this.req,
      });

      const nextDescription = replaceInlineImagePlaceholders(description, inlineImageReplacements);

      if (nextDescription !== description) {
        await sails.helpers.cards.updateOne.with({
          record: card,
          values: {
            description: nextDescription,
          },
          request: this.req,
        });
      }
    } catch (error) {
      sails.log.warn('PlankaZoho:attachment import-error', error.message);
    }

    if (currentMessageIds.length > 0) {
      await saveMessageIds(project.id, card.id, currentMessageIds);
    }

    return {
      item: {
        id: card.id,
        mode: 'card',
      },
    };
  },
};
