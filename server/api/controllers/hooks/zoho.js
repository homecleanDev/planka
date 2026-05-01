const POSITION_GAP = 65535;

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const { getDescriptionSource, getThreadMessageIds } = require('../../../utils/zohoWebhook');

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
    const payload = _.isPlainObject(this.req.body) ? this.req.body : {};

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

    const folderId =
      _.isFinite(payload.folderId) || _.isString(payload.folderId)
        ? String(payload.folderId)
        : null;
    const messageId = getPayloadMessageId(payload);

    const projectZohoConnection = _.isPlainObject(project.zohoConnection)
      ? project.zohoConnection
      : null;

    let zohoAccountId = projectZohoConnection?.accountId || sails.config.custom.zohoMailAccountId;
    let zohoAccessToken =
      projectZohoConnection?.accessToken || sails.config.custom.zohoMailOAuthToken;
    const zohoRefreshToken = projectZohoConnection?.refreshToken;
    const isZohoAccessTokenExpired =
      projectZohoConnection?.accessTokenExpiresAt &&
      new Date(projectZohoConnection.accessTokenExpiresAt).getTime() <= Date.now() + 60 * 1000;

    if ((!zohoAccessToken || isZohoAccessTokenExpired) && zohoRefreshToken) {
      const refreshedToken = await refreshZohoAccessToken(zohoRefreshToken);

      if (refreshedToken) {
        zohoAccessToken = refreshedToken.accessToken;

        if (projectZohoConnection) {
          const nextZohoConnection = {
            ...projectZohoConnection,
            accessToken: refreshedToken.accessToken,
            accessTokenExpiresAt: refreshedToken.expiresAt,
          };

          const updatedProject = await sails.helpers.projects.updateOne.with({
            record: project,
            values: {
              zohoConnection: nextZohoConnection,
            },
            request: this.req,
          });

          if (updatedProject) {
            project.zohoConnection = nextZohoConnection;
            zohoAccountId = nextZohoConnection.accountId || zohoAccountId;
          }
        }
      }
    }

    let headerContent = null;
    if (zohoAccountId && zohoAccessToken && folderId && messageId) {
      try {
        headerContent = await sails.helpers.utils.fetchZohoMessageHeaders.with({
          baseUrl: sails.config.custom.zohoMailApiBaseUrl,
          accountId: zohoAccountId,
          oAuthToken: zohoAccessToken,
          folderId,
          messageId,
        });
      } catch (error) {
        sails.log.warn('Unable to fetch Zoho message headers', error.message);
      }
    }

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
        const {
          card,
          board: replyBoard,
          project: replyProject,
        } = await sails.helpers.cards
          .getProjectPath({
            id: links[0].cardId,
          })
          .intercept('pathNotFound', () => null);

        if (card && replyBoard && replyProject && replyProject.id === project.id) {
          const commentText = description || '(No content)';

          await sails.helpers.actions.createOne.with({
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

    if (zohoAccountId && zohoAccessToken && folderId && messageId) {
      try {
        sails.log.info(
          'PlankaZoho:attachment import-start',
          JSON.stringify({
            projectId: project.id,
            cardId: card.id,
            folderId,
            messageId,
            hasAttachment: payload.hasAttachment,
          }),
        );

        const uploadedAttachments = await sails.helpers.utils.fetchZohoMessageAttachments.with({
          baseUrl: sails.config.custom.zohoMailApiBaseUrl,
          accountId: zohoAccountId,
          oAuthToken: zohoAccessToken,
          folderId,
          messageId,
          payload,
        });

        await Promise.all(
          uploadedAttachments.map((fileData) =>
            sails.helpers.attachments.createOne.with({
              values: {
                ...fileData,
                card,
                creatorUser,
              },
              request: this.req,
            }),
          ),
        );

        sails.log.info(
          'PlankaZoho:attachment card-attachments-created',
          JSON.stringify({
            projectId: project.id,
            cardId: card.id,
            count: uploadedAttachments.length,
          }),
        );
      } catch (error) {
        sails.log.warn('PlankaZoho:attachment import-error', error.message);
      }
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
