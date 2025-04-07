const path = require('path');
const rimraf = require('rimraf');
const s3 = require('../s3');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    board: {
      type: 'ref',
      required: true,
    },
    card: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    if (inputs.record.id === inputs.card.coverAttachmentId) {
      await sails.helpers.cards.updateOne.with({
        record: inputs.card,
        values: {
          coverAttachmentId: null,
        },
        request: inputs.request,
      });
    }

    const attachment = await Attachment.archiveOne(inputs.record.id);

    if (attachment) {
      try {
        // Delete original file from S3
        await s3.deleteFile(`attachments/${attachment.dirname}/${attachment.filename}`);

        // Delete thumbnail from S3 if it exists
        if (attachment.image) {
          await s3.deleteFile(
            `attachments/${attachment.dirname}/thumbnails/cover-256.${attachment.image.thumbnailsExtension}`,
          );
        }
      } catch (error) {
        console.warn(error.stack); // eslint-disable-line no-console
      }

      sails.sockets.broadcast(
        `board:${inputs.board.id}`,
        'attachmentDelete',
        {
          item: attachment,
        },
        inputs.request,
      );
    }

    return attachment;
  },
};
