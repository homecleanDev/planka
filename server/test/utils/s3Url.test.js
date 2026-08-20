const { expect } = require('chai');

const { buildS3ObjectUrl, encodeS3Key } = require('../../utils/s3Url');

describe('s3Url utils', () => {
  describe('#encodeS3Key()', () => {
    it('encodes reserved characters in key segments without encoding path separators', () => {
      const key =
        'attachments/e3f95bc4-dade-44e5-8db2-e7f3906b2398/017. PPG-Ferrum-NA-18.08.2026-£988.05+197.61=1185.66-raised.xlsx';

      expect(encodeS3Key(key)).to.equal(
        'attachments/e3f95bc4-dade-44e5-8db2-e7f3906b2398/017.%20PPG-Ferrum-NA-18.08.2026-%C2%A3988.05%2B197.61%3D1185.66-raised.xlsx',
      );
    });
  });

  describe('#buildS3ObjectUrl()', () => {
    it('builds a public S3 URL with an encoded key path', () => {
      process.env.AWS_BUCKET = 'homeclean-planka-prod';
      process.env.AWS_DEFAULT_REGION = 'eu-west-2';

      const url = buildS3ObjectUrl(
        'attachments/e3f95bc4-dade-44e5-8db2-e7f3906b2398/017. PPG-Ferrum-NA-18.08.2026-£988.05+197.61=1185.66-raised.xlsx',
      );

      expect(url).to.equal(
        'https://homeclean-planka-prod.s3.eu-west-2.amazonaws.com/attachments/e3f95bc4-dade-44e5-8db2-e7f3906b2398/017.%20PPG-Ferrum-NA-18.08.2026-%C2%A3988.05%2B197.61%3D1185.66-raised.xlsx',
      );
    });
  });
});
