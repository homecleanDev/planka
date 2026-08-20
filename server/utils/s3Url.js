const encodeS3Key = (key) => key.split('/').map(encodeURIComponent).join('/');

const buildS3ObjectUrl = (key) =>
  `https://${process.env.AWS_BUCKET}.s3.${process.env.AWS_DEFAULT_REGION}.amazonaws.com/${encodeS3Key(
    key,
  )}`;

module.exports = {
  buildS3ObjectUrl,
  encodeS3Key,
};
