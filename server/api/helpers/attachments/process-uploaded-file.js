const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const moveFile = require('move-file');
const filenamify = require('filenamify');
const { v4: uuid } = require('uuid');
const sharp = require('sharp');
const s3Helper = require('../s3');

module.exports = {
  inputs: {
    file: {
      type: 'json',
      required: true,
    },
  },

  async fn(inputs) {
    const s3 = await s3Helper.fn();
    const dirname = uuid();
    const filename = filenamify(inputs.file.filename);
    const key = `attachments/${dirname}/${filename}`;

    // Upload original file to S3
    const fileKey = await s3.uploadFile(inputs.file, key);

    let image = sharp(inputs.file.fd, {
      animated: true,
    });

    let metadata;
    try {
      metadata = await image.metadata();
    } catch (error) {} // eslint-disable-line no-empty

    const fileData = {
      dirname,
      filename,
      image: null,
      name: inputs.file.filename,
      url: fileKey,
    };

    if (metadata && !['svg', 'pdf'].includes(metadata.format)) {
      let { width, pageHeight: height = metadata.height } = metadata;
      if (metadata.orientation && metadata.orientation > 4) {
        [image, width, height] = [image.rotate(), height, width];
      }

      const isPortrait = height > width;
      const thumbnailsExtension = metadata.format === 'jpeg' ? 'jpg' : metadata.format;
      const thumbnailKey = `attachments/${dirname}/thumbnails/cover-256.${thumbnailsExtension}`;

      try {
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

        // Upload thumbnail to S3
        const uploadedThumbnailKey = await s3.uploadFile(
          { fd: thumbnailBuffer, type: `image/${thumbnailsExtension}` },
          thumbnailKey,
        );

        fileData.image = {
          width,
          height,
          thumbnailsExtension,
          url: uploadedThumbnailKey,
        };
      } catch (error) {
        console.warn(error.stack); // eslint-disable-line no-console
      }
    }

    // Clean up temporary file
    try {
      rimraf.sync(inputs.file.fd);
    } catch (error) {
      console.warn(error.stack); // eslint-disable-line no-console
    }

    return fileData;
  },
};
