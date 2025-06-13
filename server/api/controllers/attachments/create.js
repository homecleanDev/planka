const util = require('util');
const { v4: uuid } = require('uuid');

const Errors = {
  NOT_ENOUGH_RIGHTS: {
    notEnoughRights: 'Not enough rights',
  },
  CARD_NOT_FOUND: {
    cardNotFound: 'Card not found',
  },
  NO_FILE_WAS_UPLOADED: {
    noFileWasUploaded: 'No file was uploaded',
  },
};

module.exports = {
  inputs: {
    cardId: {
      type: 'string',
      regex: /^[0-9]+$/,
      required: true,
    },
    requestId: {
      type: 'string',
      isNotEmptyString: true,
    },
    // For direct S3 uploads
    key: {
      type: 'string',
    },
    dirname: {
      type: 'string',
    },
    filename: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
  },

  exits: {
    notEnoughRights: {
      responseType: 'forbidden',
    },
    cardNotFound: {
      responseType: 'notFound',
    },
    noFileWasUploaded: {
      responseType: 'unprocessableEntity',
    },
    uploadError: {
      responseType: 'unprocessableEntity',
    },
  },

  async fn(inputs, exits) {
    const { currentUser } = this.req;

    const { card } = await sails.helpers.cards
      .getProjectPath(inputs.cardId)
      .intercept('pathNotFound', () => Errors.CARD_NOT_FOUND);

    const boardMembership = await BoardMembership.findOne({
      boardId: card.boardId,
      userId: currentUser.id,
    });

    if (!boardMembership) {
      throw Errors.CARD_NOT_FOUND; // Forbidden
    }

    if (boardMembership.role !== BoardMembership.Roles.EDITOR) {
      throw Errors.NOT_ENOUGH_RIGHTS;
    }

    let fileData;

    if (inputs.key) {
      // Direct S3 upload
      fileData = {
        dirname: inputs.dirname,
        filename: inputs.filename,
        name: inputs.name || inputs.filename,
        url: inputs.key,
        coverUrl: inputs.key,
        image: inputs.key, // TODO: Add image processing for direct uploads
      };
    } else {
      // Legacy file upload through server
      const upload = util.promisify((options, callback) =>
        this.req.file('file').upload(options, (error, files) => callback(error, files)),
      );

      let files;
      try {
        files = await upload({
          saveAs: uuid(),
          maxBytes: null,
        });
      } catch (error) {
        return exits.uploadError(error.message);
      }

      if (files.length === 0) {
        throw Errors.NO_FILE_WAS_UPLOADED;
      }

      const file = _.last(files);
      fileData = await sails.helpers.attachments.processUploadedFile(file);
    }

    const attachment = await sails.helpers.attachments.createOne.with({
      values: {
        ...fileData,
        card,
        creatorUser: currentUser,
      },
      requestId: inputs.requestId,
      request: this.req,
    });

    return exits.success({
      item: attachment,
    });
  },
};
