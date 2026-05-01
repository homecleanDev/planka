const { expect } = require('chai');

const { getDescription, getThreadMessageIds, htmlToMarkdown } = require('../../utils/zohoWebhook');

describe('zohoWebhook utils', () => {
  describe('#htmlToMarkdown()', () => {
    it('preserves line breaks and list items from common HTML tags', () => {
      const result = htmlToMarkdown(
        '<div>Hello</div><div>World</div><p>Next</p><ul><li>One</li><li>Two</li></ul>',
      );

      expect(result).to.equal('Hello\nWorld\n\nNext\n- One\n- Two');
    });

    it('converts links and inline formatting to markdown', () => {
      const result = htmlToMarkdown(
        '<p><strong>Important</strong> <em>notice</em> <a href="https://example.com">Open link</a></p>',
      );

      expect(result).to.equal('**Important** *notice* [Open link](https://example.com)');
    });

    it('keeps forwarded message content and email footer text', () => {
      const result = htmlToMarkdown(
        '<div>Sample email with forwarded message<br><br><div>---------- Forwarded message ---------<br>From: &lt;<a href="mailto:noreply@example.com">noreply@example.com</a>&gt;<br></div><br><p>Greetings from MediCard GO!</p><p>Thank you.</p><i>(This is an auto-generated email. Please do not respond.)</i></div>',
      );

      expect(result).to.equal(
        'Sample email with forwarded message\n\n---------- Forwarded message ---------\nFrom: <[noreply@example.com](mailto:noreply@example.com)>\n\nGreetings from MediCard GO!\n\nThank you.\n\n*(This is an auto-generated email. Please do not respond.)*',
      );
    });
  });

  describe('#getDescription()', () => {
    it('uses html before summary so formatting is preserved', () => {
      const result = getDescription({
        summary: 'Line 1 Line 2',
        html: '<div>Line 1<br>Line 2</div>',
      });

      expect(result).to.equal('Line 1\nLine 2');
    });

    it('falls back to summary when html is unavailable', () => {
      const result = getDescription({
        summary: 'Line 1\r\n\r\nLine 2',
      });

      expect(result).to.equal('Line 1\n\nLine 2');
    });
  });

  describe('#getThreadMessageIds()', () => {
    it('extracts current and parent message ids from payload + headers', () => {
      const result = getThreadMessageIds(
        {
          messageIdString: '1776434787752162600',
        },
        {
          'Message-Id': ['<new-message@example.com>'],
          'In-Reply-To': ['<parent-message@example.com>'],
          References: ['<parent-message@example.com> <root-message@example.com>'],
        },
      );

      expect(result.isReply).to.equal(true);
      expect(result.currentMessageIds).to.deep.equal([
        '1776434787752162600',
        'new-message@example.com',
      ]);
      expect(result.parentMessageIds).to.deep.equal([
        'parent-message@example.com',
        'root-message@example.com',
      ]);
    });

    it('returns non-reply when reply headers are missing', () => {
      const result = getThreadMessageIds(
        {
          messageIdString: '1776432842013159500',
        },
        {
          'Message-Id': ['<first-message@example.com>'],
        },
      );

      expect(result.isReply).to.equal(false);
      expect(result.parentMessageIds).to.deep.equal([]);
    });
  });
});
