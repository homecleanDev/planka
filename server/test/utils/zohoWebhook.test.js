const { expect } = require('chai');

const { cleanEmailText, getDescription, htmlToPlainText } = require('../../utils/zohoWebhook');

describe('zohoWebhook utils', () => {
  describe('#htmlToPlainText()', () => {
    it('preserves line breaks from common HTML tags', () => {
      const result = htmlToPlainText('<div>Hello</div><div>World</div><p>Next</p><ul><li>One</li><li>Two</li></ul>');

      expect(result).to.equal('Hello\nWorld\nNext\n- One\n- Two');
    });
  });

  describe('#cleanEmailText()', () => {
    it('strips a trailing signature block after a sign-off', () => {
      const result = cleanEmailText(
        'Issue details here.\n\nKind regards,\nAlbert Buenaventura\nSupport Team',
      );

      expect(result).to.equal('Issue details here.');
    });

    it('strips quoted reply headers and older thread content', () => {
      const result = cleanEmailText(
        'Latest update from guest.\n\nOn Mon, Apr 14, 2026 at 9:00 AM Support wrote:\nOlder thread',
      );

      expect(result).to.equal('Latest update from guest.');
    });
  });

  describe('#getDescription()', () => {
    it('uses html before summary so line breaks are preserved', () => {
      const result = getDescription({
        summary: 'Line 1\r\n\r\nLine 2',
        html: '<div>Line 1<br>Line 2</div>',
      });

      expect(result).to.equal('Line 1\nLine 2');
    });

    it('falls back to html and strips the signature', () => {
      const result = getDescription({
        html: '<div>Hello team,<br><br>The guest reported a leak.</div><div class="zmail_signature_below">Thanks,<br>Albert</div>',
      });

      expect(result).to.equal('Hello team,\n\nThe guest reported a leak.');
    });

    it('falls back to summary when html is unavailable', () => {
      const result = getDescription({
        summary: 'Line 1\r\n\r\nLine 2',
      });

      expect(result).to.equal('Line 1\n\nLine 2');
    });
  });
});
