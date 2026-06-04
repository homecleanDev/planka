const filenamify = require('filenamify');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');

const LOG_VERSION = 'inline-api-v2';
const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
const IMAGE_TAG_REGEX = /<img\b([^>]*)>/gi;
const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const decodeHtmlEntities = (value) =>
  value.replace(/&amp;|&lt;|&gt;|&quot;|&#39;/gi, (match) => HTML_ENTITY_MAP[match] || match);

const pickData = (body) => {
  if (!body) {
    return null;
  }

  if (_.isPlainObject(body.data)) {
    return body.data;
  }

  if (Array.isArray(body.data) && body.data.length > 0 && _.isPlainObject(body.data[0])) {
    return body.data[0];
  }

  return _.isPlainObject(body) ? body : null;
};

const getAttachmentCandidates = (data) => {
  const candidates = [
    ...toArray(data.attachmentInfo),
    ...toArray(data.attachments),
    ...toArray(data.attachmentlist),
    ...toArray(data.attachmentList),
  ];

  return candidates.filter(_.isPlainObject);
};

const getAttachmentId = (attachment) =>
  attachment.attachmentId ||
  attachment.attachmentID ||
  attachment.id ||
  attachment.fileId ||
  attachment.partId ||
  null;

const getInlineContentId = (attachment) =>
  attachment.contentId ||
  attachment.contentID ||
  attachment.cid ||
  attachment.content_id ||
  null;

const getAttachmentName = (attachment, fallbackName) =>
  attachment.attachmentName ||
  attachment.fileName ||
  attachment.name ||
  attachment.file_name ||
  fallbackName;

const isInlineAttachment = (attachment) =>
  attachment.isInline === true ||
  attachment.inline === true ||
  attachment.contentDisposition === 'inline' ||
  attachment.disposition === 'inline' ||
  (_.isString(attachment.cid) && attachment.cid.length > 0) ||
  (_.isString(attachment.contentId) && attachment.contentId.length > 0);

const getFilenameFromContentDisposition = (value) => {
  if (!_.isString(value)) {
    return null;
  }

  const match = value.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/i);
  if (!match) {
    return null;
  }

  return decodeURIComponent(match[1].trim().replace(/"$/, ''));
};

const getCandidateKey = (attachment) =>
  getAttachmentId(attachment) || getInlineContentId(attachment) || null;

const getPayloadMessageIds = (payload, fallbackMessageId) => {
  const result = [];

  [fallbackMessageId, payload?.messageIdString, payload?.messageId].forEach((value) => {
    const messageId =
      (_.isFinite(value) || _.isString(value)) && String(value).trim() ? String(value).trim() : null;

    if (messageId && !result.includes(messageId)) {
      result.push(messageId);
    }
  });

  return result;
};

const getInlineContentIdCandidates = (contentId) => {
  if (!_.isString(contentId) || !contentId.trim()) {
    return [];
  }

  const result = [contentId];
  const stripped = contentId.replace(/__inline__img__src$/i, '');

  if (stripped && stripped !== contentId) {
    result.push(stripped);
  }

  return result;
};

const getInlineAcceptHeaderCandidates = () => [
  undefined,
  'image/*',
  'application/octet-stream',
  '*/*',
  'application/json',
];

const extractInlineImageCandidates = (payload) => {
  if (!_.isPlainObject(payload) || !_.isString(payload.html) || !payload.html.trim()) {
    return [];
  }

  const result = [];
  let match = IMAGE_TAG_REGEX.exec(payload.html);

  while (match) {
    const attrs = match[1];
    const srcMatch = attrs.match(/\bsrc=(['"])(.*?)\1/i);
    const rawSrc = srcMatch ? decodeHtmlEntities(srcMatch[2]) : null;

    if (rawSrc && rawSrc.startsWith('/zm/ImageDisplay')) {
      const url = new URL(rawSrc, 'https://mail.zoho.com');
      const contentId = url.searchParams.get('cid');
      const fileName = url.searchParams.get('f');

      if (contentId && fileName) {
        result.push({
          contentId,
          fileName,
          inline: true,
        });
      }
    }

    match = IMAGE_TAG_REGEX.exec(payload.html);
  }

  IMAGE_TAG_REGEX.lastIndex = 0;

  return result;
};

const resolveBodyBuffer = async (response) => {
  const contentType = (response.headers.get('content-type') || '').toLowerCase();

  if (contentType.includes('application/json')) {
    const body = await response.json();
    const data = pickData(body);

    if (_.isString(data?.content) && data.content.trim()) {
      return Buffer.from(data.content, 'base64');
    }

    if (_.isString(body?.content) && body.content.trim()) {
      return Buffer.from(body.content, 'base64');
    }

    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

const buildImageMeta = async (s3, dirname, buffer) => {
  let image = sharp(buffer, {
    animated: true,
  });

  let metadata;
  try {
    metadata = await image.metadata();
  } catch (error) {
    return null;
  }

  if (!metadata || ['svg', 'pdf'].includes(metadata.format)) {
    return null;
  }

  let { width, pageHeight: height = metadata.height } = metadata;
  if (!width || !height) {
    return null;
  }

  if (metadata.orientation && metadata.orientation > 4) {
    [image, width, height] = [image.rotate(), height, width];
  }

  const isPortrait = height > width;
  const thumbnailsExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
  const thumbnailKey = `attachments/${dirname}/thumbnails/cover-256.${thumbnailsExtension}`;

  const thumbnailBuffer = await image
    .resize(
      256,
      isPortrait ? 320 : undefined,
      width < 256 || (isPortrait && height < 320)
        ? {
            kernel: sharp.kernel.nearest,
          }
        : undefined,
    )
    .toBuffer();

  const thumbnailUrl = await s3.uploadFile(
    {
      fd: thumbnailBuffer,
      type: `image/${thumbnailsExtension}`,
    },
    thumbnailKey,
  );

  return {
    width,
    height,
    thumbnailsExtension,
    url: thumbnailUrl,
  };
};

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
    payload: {
      type: 'json',
    },
  },

  async fn(inputs) {
    sails.log.info(
      'PlankaZoho:attachment start',
      JSON.stringify({
        accountId: inputs.accountId,
        folderId: inputs.folderId,
        messageId: inputs.messageId,
        version: LOG_VERSION,
      }),
    );

    const payload = _.isPlainObject(inputs.payload) ? inputs.payload : null;
    const messageIds = getPayloadMessageIds(payload, inputs.messageId);
    const payloadAttachmentInfos = payload ? getAttachmentCandidates(payload) : [];
    const inlineImageInfos = extractInlineImageCandidates(payload);
    sails.log.info(
      'PlankaZoho:attachment payload-candidates',
      JSON.stringify({
        count: payloadAttachmentInfos.length,
        inlineImageCount: inlineImageInfos.length,
        inlineImageIds: inlineImageInfos.map((item) => item.contentId),
        messageIds,
      }),
    );

    const attachmentInfoUrl = new URL(
      `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${inputs.messageId}/attachmentinfo`,
      inputs.baseUrl,
    );
    attachmentInfoUrl.searchParams.set('includeInline', 'true');

    const messageResponse = await fetch(attachmentInfoUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Zoho-oauthtoken ${inputs.oAuthToken}`,
      },
    });

    let messageData = null;

    if (!messageResponse.ok) {
      sails.log.warn(
        'PlankaZoho:attachment attachmentinfo-fetch-failed',
        JSON.stringify({
          status: messageResponse.status,
        }),
      );
    } else {
      const messageBody = await messageResponse.json();
      messageData = pickData(messageBody);
    }

    if (!messageData && inlineImageInfos.length === 0) {
      sails.log.warn('PlankaZoho:attachment attachmentinfo-data-empty');
      return [];
    }

    const attachmentInfos = [
      ...payloadAttachmentInfos,
      ...(messageData ? getAttachmentCandidates(messageData) : []),
      ...inlineImageInfos,
    ].filter((item, index, arr) => {
      const key = getCandidateKey(item);
      return !!key && arr.findIndex((candidate) => getCandidateKey(candidate) === key) === index;
    });

    sails.log.info(
      'PlankaZoho:attachment merged-candidates',
      JSON.stringify({
        count: attachmentInfos.length,
        ids: attachmentInfos.map((item) => getCandidateKey(item)).filter(Boolean),
      }),
    );
    if (attachmentInfos.length === 0) {
      sails.log.info('PlankaZoho:attachment no-attachments-found');
      return [];
    }

    const s3 = await sails.helpers.s3();
    const results = [];

    await Promise.all(
      attachmentInfos.map(async (attachment, index) => {
        const attachmentId = getAttachmentId(attachment);
        const inlineContentId = getInlineContentId(attachment);
        const candidateKey = getCandidateKey(attachment);
        if (!candidateKey) {
          sails.log.warn('PlankaZoho:attachment missing-attachment-id');
          return;
        }

        const downloadTargets = [];
        const inlineFileName = getAttachmentName(attachment, `inline-image-${index + 1}.png`);

        if (inlineContentId && inlineFileName) {
          getInlineContentIdCandidates(inlineContentId).forEach((contentId) => {
            messageIds.forEach((messageId) => {
              getInlineAcceptHeaderCandidates().forEach((accept) => {
                const inlineUrl = new URL(
                  `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${messageId}/inline`,
                  inputs.baseUrl,
                );
                inlineUrl.searchParams.set('contentId', contentId);
                inlineUrl.searchParams.set('fileName', inlineFileName);
                downloadTargets.push({
                  url: inlineUrl,
                  inline: true,
                  contentId,
                  messageId,
                  accept,
                });
              });
            });
          });
        }

        if (attachmentId) {
          [
            `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${inputs.messageId}/attachments/${attachmentId}`,
            `/api/accounts/${inputs.accountId}/messages/${inputs.messageId}/attachments/${attachmentId}`,
          ].forEach((path) =>
            downloadTargets.push({
              url: new URL(path, inputs.baseUrl),
              inline: false,
            }),
          );
        }

        let buffer = null;
        let contentType = 'application/octet-stream';
        let headerFilename = null;

        for (const target of downloadTargets) {
          const { url: downloadUrl } = target;
          sails.log.info(
            'PlankaZoho:attachment download-attempt',
            JSON.stringify({
              attachmentId: candidateKey,
              inline: target.inline || isInlineAttachment(attachment),
              contentId: target.contentId,
              messageId: target.messageId || inputs.messageId,
              accept: target.accept || 'none',
              path: downloadUrl.pathname,
            }),
          );

          const headers = {
            Authorization: `Zoho-oauthtoken ${inputs.oAuthToken}`,
          };

          if (target.accept) {
            headers.Accept = target.accept;
          } else if (!target.inline) {
            headers.Accept = 'application/octet-stream';
          }

          const downloadResponse = await fetch(downloadUrl, {
            method: 'GET',
            headers,
          });

          if (!downloadResponse.ok) {
            let errorPreview = null;
            try {
              errorPreview = (await downloadResponse.text()).slice(0, 500);
            } catch (error) {}

            sails.log.warn(
              'PlankaZoho:attachment download-failed',
              JSON.stringify({
                attachmentId: candidateKey,
                inline: target.inline || isInlineAttachment(attachment),
                contentId: target.contentId,
                messageId: target.messageId || inputs.messageId,
                accept: target.accept || 'none',
                status: downloadResponse.status,
                path: downloadUrl.pathname,
                body: errorPreview,
              }),
            );
            continue;
          }

          buffer = await resolveBodyBuffer(downloadResponse);
          contentType = downloadResponse.headers.get('content-type') || contentType;
          headerFilename = getFilenameFromContentDisposition(
            downloadResponse.headers.get('content-disposition'),
          );

          if (buffer && buffer.length > 0) {
            sails.log.info(
              'PlankaZoho:attachment download-success',
              JSON.stringify({
                attachmentId: candidateKey,
                inline: target.inline || isInlineAttachment(attachment),
                contentId: target.contentId,
                messageId: target.messageId || inputs.messageId,
                accept: target.accept || 'none',
                bytes: buffer.length,
                path: downloadUrl.pathname,
              }),
            );
            break;
          }
        }

        if (!buffer || buffer.length === 0) {
          sails.log.warn(
            'PlankaZoho:attachment empty-download-buffer',
            JSON.stringify({
              attachmentId: candidateKey,
              inline: isInlineAttachment(attachment),
            }),
          );
          return;
        }

        const inferredFilename = getAttachmentName(
          attachment,
          headerFilename || `attachment-${index + 1}`,
        );
        const filename = filenamify(inferredFilename || `attachment-${index + 1}`);
        const dirname = uuid();
        const key = `attachments/${dirname}/${filename}`;

        const url = await s3.uploadFile(
          {
            fd: buffer,
            type: contentType,
          },
          key,
        );

        let image = null;
        try {
          image = await buildImageMeta(s3, dirname, buffer);
        } catch (error) {
          sails.log.warn(
            'PlankaZoho:attachment thumbnail-failed',
            JSON.stringify({
              attachmentId: candidateKey,
              inline: isInlineAttachment(attachment),
              filename,
              error: error.message,
            }),
          );
        }

        results.push({
          dirname,
          filename,
          image,
          inlineContentId: inlineContentId || null,
          inlineContentIdCandidates: inlineContentId
            ? getInlineContentIdCandidates(inlineContentId)
            : [],
          name: inferredFilename || filename,
          url,
        });

        sails.log.info(
          'PlankaZoho:attachment upload-success',
          JSON.stringify({
            attachmentId: candidateKey,
            inline: isInlineAttachment(attachment),
            filename,
            url,
          }),
        );
      }),
    );

    sails.log.info(
      'PlankaZoho:attachment completed',
      JSON.stringify({
        uploadedCount: results.length,
      }),
    );

    return results;
  },
};
