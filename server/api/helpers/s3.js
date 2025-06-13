const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

module.exports = {
  friendlyName: 'S3',
  description: 'Handle S3 operations',

  inputs: {},

  exits: {
    success: {
      description: 'All done.',
    },
  },

  fn: async function() {
    return {
      async uploadFile(file, key) {
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
          Body: file.fd instanceof Buffer ? file.fd : require('fs').createReadStream(file.fd),
          ContentType: file.type,
        });

        await s3Client.send(command);
        return key;
      },

      async deleteFile(key) {
        const command = new DeleteObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
        });

        await s3Client.send(command);
      },

      async generatePresignedUrl(key, contentType, expiresIn = 3600) {
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET,
          Key: key,
          ContentType: contentType,
        });

        const url = await getSignedUrl(s3Client, command, {
          expiresIn,
          signableHeaders: new Set(['host']),
        });

        return url;
      },

      async getSignedUrl(key, expiresIn = 3600) {
        return this.generatePresignedUrl(key, null, expiresIn);
      },
    };
  },
};
