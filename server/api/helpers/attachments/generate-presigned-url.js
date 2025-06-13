const { v4: uuid } = require('uuid');
const filenamify = require('filenamify');
const s3Helper = require('../s3');

module.exports = {
  inputs: {
    filename: {
      type: 'string',
      required: true,
    },
    contentType: {
      type: 'string',
      required: true,
    },
  },

  async fn(inputs) {
    const s3 = await s3Helper.fn();
    const dirname = uuid();
    const filename = filenamify(inputs.filename);
    const key = `attachments/${dirname}/${filename}`;

    const presignedUrl = await s3.generatePresignedUrl(key, inputs.contentType);

    return {
      presignedUrl,
      key,
      dirname,
      filename,
    };
  },
};
