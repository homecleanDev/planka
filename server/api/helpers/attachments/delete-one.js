const path = require('path');
const rimraf = require('rimraf');
const s3Helper = require('../s3');

module.exports = {
  inputs: {
    record: {
      type: 'ref',
      required: true,
    },
    request: {
      type: 'ref',
    },
  },

  async fn(inputs) {
    const s3 = await s3Helper.fn();

    // Delete main file
    const mainKey = `attachments/${inputs.record.dirname}/${inputs.record.filename}`;
    try {
      await s3.deleteFile(mainKey);
    } catch (error) {
      console.warn('Failed to delete main file:', error);
    }

    // Delete thumbnail if it exists
    if (inputs.record.image && inputs.record.image.thumbnailsExtension) {
      const thumbnailKey = `attachments/${inputs.record.dirname}/thumbnails/cover-256.${inputs.record.image.thumbnailsExtension}`;
      try {
        await s3.deleteFile(thumbnailKey);
      } catch (error) {
        console.warn('Failed to delete thumbnail:', error);
      }
    }

    const attachment = await Attachment.destroyOne(inputs.record.id);

    if (!attachment) {
      return null;
    }

    if (inputs.request) {
      // Get the card to find the board ID
      const card = await Card.findOne(inputs.record.cardId);
      if (card) {
        sails.sockets.broadcast(
          `board:${card.boardId}`,
          'attachmentDelete',
          {
            item: attachment,
          },
          inputs.request,
        );
      }
    }

    return attachment;
  },
};
