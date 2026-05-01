const filenamify = require('filenamify');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');

const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

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

const getAttachmentName = (attachment, fallbackName) =>
  attachment.attachmentName ||
  attachment.fileName ||
  attachment.name ||
  attachment.file_name ||
  fallbackName;

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
      }),
    );

    const payload = _.isPlainObject(inputs.payload) ? inputs.payload : null;
    const payloadAttachmentInfos = payload ? getAttachmentCandidates(payload) : [];
    sails.log.info(
      'PlankaZoho:attachment payload-candidates',
      JSON.stringify({
        count: payloadAttachmentInfos.length,
      }),
    );

    const attachmentInfoUrl = new URL(
      `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${inputs.messageId}/attachmentinfo`,
      inputs.baseUrl,
    );
    attachmentInfoUrl.searchParams.set('includeInline', 'false');

    const messageResponse = await fetch(attachmentInfoUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Zoho-oauthtoken ${inputs.oAuthToken}`,
      },
    });

    if (!messageResponse.ok) {
      sails.log.warn(
        'PlankaZoho:attachment attachmentinfo-fetch-failed',
        JSON.stringify({
          status: messageResponse.status,
        }),
      );
      return [];
    }

    const messageBody = await messageResponse.json();
    const messageData = pickData(messageBody);
    if (!messageData) {
      sails.log.warn('PlankaZoho:attachment attachmentinfo-data-empty');
      return [];
    }

    const attachmentInfos = [
      ...payloadAttachmentInfos,
      ...getAttachmentCandidates(messageData),
    ].filter((item, index, arr) => {
      const id = getAttachmentId(item);
      return !!id && arr.findIndex((candidate) => getAttachmentId(candidate) === id) === index;
    });

    sails.log.info(
      'PlankaZoho:attachment merged-candidates',
      JSON.stringify({
        count: attachmentInfos.length,
        ids: attachmentInfos.map((item) => getAttachmentId(item)).filter(Boolean),
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
        if (!attachmentId) {
          sails.log.warn('PlankaZoho:attachment missing-attachment-id');
          return;
        }

        const downloadPaths = [
          `/api/accounts/${inputs.accountId}/folders/${inputs.folderId}/messages/${inputs.messageId}/attachments/${attachmentId}`,
          `/api/accounts/${inputs.accountId}/messages/${inputs.messageId}/attachments/${attachmentId}`,
        ];

        let buffer = null;
        let contentType = 'application/octet-stream';
        let headerFilename = null;

        for (const path of downloadPaths) {
          const downloadUrl = new URL(path, inputs.baseUrl);
          sails.log.info(
            'PlankaZoho:attachment download-attempt',
            JSON.stringify({
              attachmentId,
              path: downloadUrl.pathname,
            }),
          );

          const downloadResponse = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
              Accept: 'application/octet-stream',
              'Content-Type': 'application/json',
              Authorization: `Zoho-oauthtoken ${inputs.oAuthToken}`,
            },
          });

          if (!downloadResponse.ok) {
            let errorPreview = null;
            try {
              errorPreview = (await downloadResponse.text()).slice(0, 500);
            } catch (error) {}

            sails.log.warn(
              'PlankaZoho:attachment download-failed',
              JSON.stringify({
                attachmentId,
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
                attachmentId,
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
              attachmentId,
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
              attachmentId,
              filename,
              error: error.message,
            }),
          );
        }

        results.push({
          dirname,
          filename,
          image,
          name: inferredFilename || filename,
          url,
        });

        sails.log.info(
          'PlankaZoho:attachment upload-success',
          JSON.stringify({
            attachmentId,
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
