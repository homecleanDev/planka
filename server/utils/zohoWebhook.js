const _ = require('lodash');

const DOUBLE_BREAK_BLOCK_CLOSE_REGEX = /<\/(p|h[1-6]|blockquote|table|ul|ol)>/gi;
const SINGLE_BREAK_BLOCK_CLOSE_REGEX = /<\/(div|tr)>/gi;
const LINE_BREAK_REGEX = /<br\s*\/?>/gi;
const LIST_ITEM_OPEN_REGEX = /<li\b[^>]*>/gi;
const LIST_ITEM_CLOSE_REGEX = /<\/li>/gi;
const TABLE_CELL_CLOSE_REGEX = /<\/td>\s*<td\b[^>]*>/gi;
const PARAGRAPH_TAG_REGEX = /<\/?p\b[^>]*>/gi;
const BOLD_OPEN_REGEX = /<(strong|b)\b[^>]*>/gi;
const BOLD_CLOSE_REGEX = /<\/(strong|b)>/gi;
const ITALIC_OPEN_REGEX = /<(em|i)\b[^>]*>/gi;
const ITALIC_CLOSE_REGEX = /<\/(em|i)>/gi;
const UNDERLINE_TAG_REGEX = /<\/?u\b[^>]*>/gi;
const IMAGE_TAG_REGEX = /<img\b([^>]*)>/gi;
const LINK_TAG_REGEX = /<a\b[^>]*href=(['"])(.*?)\1[^>]*>(.*?)<\/a>/gi;
const GENERIC_TAG_REGEX = /<[^>]+>/g;
const HTML_ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};
const RFC_MESSAGE_ID_REGEX = /<([^>]+)>/g;
const ZOHO_INLINE_IMAGE_SCHEME = 'zoho-inline-image:';
const REPLY_SEPARATOR_PATTERNS = [
  /^On .+ wrote:$/i,
  /^-----Original Message-----$/i,
  /^={2,}\s*Forwarded message\s*={2,}$/i,
  /^From:\s.+$/i,
  /^Sent:\s.+$/i,
  /^To:\s.+$/i,
  /^Subject:\s.+$/i,
  /^_{5,}$/,
  /^-{2,}\s*Forwarded message\s*-{2,}$/i,
];
const SIGNATURE_START_PATTERNS = [
  /^--\s*$/,
  /^Kind regards,?$/i,
  /^Regards,?$/i,
  /^Best regards,?$/i,
  /^Thanks,?$/i,
  /^Thank you,?$/i,
];

const normalizeMarkerLine = (value) => value.replace(/^[*_`~\s]+|[*_`~\s]+$/g, '').trim();

const normalizeLineBreaks = (value) => value.replace(/\r\n?/g, '\n');

const normalizeWhitespace = (value) =>
  normalizeLineBreaks(value)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const decodeHtmlEntities = (value) =>
  value.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/gi,
    (match) => HTML_ENTITY_MAP[match] || match,
  );

const htmlFragmentToText = (value) =>
  normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(LINE_BREAK_REGEX, '\n')
        .replace(DOUBLE_BREAK_BLOCK_CLOSE_REGEX, '\n\n')
        .replace(SINGLE_BREAK_BLOCK_CLOSE_REGEX, '\n')
        .replace(LIST_ITEM_OPEN_REGEX, '\n- ')
        .replace(LIST_ITEM_CLOSE_REGEX, '')
        .replace(TABLE_CELL_CLOSE_REGEX, ' | ')
        .replace(PARAGRAPH_TAG_REGEX, '\n\n')
        .replace(BOLD_OPEN_REGEX, '**')
        .replace(BOLD_CLOSE_REGEX, '**')
        .replace(ITALIC_OPEN_REGEX, '*')
        .replace(ITALIC_CLOSE_REGEX, '*')
        .replace(UNDERLINE_TAG_REGEX, '')
        .replace(GENERIC_TAG_REGEX, ' '),
    ),
  ).replace(/\n\n(?=- )/g, '\n');

const htmlToMarkdown = (value) => {
  const markdown = value
    .replace(LINK_TAG_REGEX, (...args) => {
      const href = args[2];
      const text = args[3];

      return `[${htmlFragmentToText(text) || href}](${decodeHtmlEntities(href)})`;
    })
    .replace(IMAGE_TAG_REGEX, (...args) => {
      const attrs = args[1];
      const srcMatch = attrs.match(/\bsrc=(['"])(.*?)\1/i);
      const altMatch = attrs.match(/\balt=(['"])(.*?)\1/i);
      const src = srcMatch ? decodeHtmlEntities(srcMatch[2]) : '';
      const alt = altMatch ? htmlFragmentToText(altMatch[2]) : 'image';

      if (src.startsWith('/zm/ImageDisplay')) {
        const url = new URL(src, 'https://mail.zoho.com');
        const contentId = url.searchParams.get('cid');

        return contentId
          ? `![${alt || 'image'}](${ZOHO_INLINE_IMAGE_SCHEME}${encodeURIComponent(contentId)})`
          : '';
      }

      return src ? `![${alt || 'image'}](${src})` : '';
    });

  return htmlFragmentToText(markdown);
};

const replaceInlineImagePlaceholders = (value, replacements) => {
  if (!_.isString(value) || !_.isPlainObject(replacements)) {
    return value;
  }

  const withImages = value.replace(
    new RegExp(`!\\[([^\\]]*)\\]\\(${ZOHO_INLINE_IMAGE_SCHEME}([^\\)\\s]+)\\)`, 'g'),
    (match, alt, encodedContentId) => {
      const contentId = decodeURIComponent(encodedContentId);
      const replacement = replacements[contentId];

      return replacement ? `![${alt || 'image'}](${replacement})` : '';
    },
  );

  return withImages.replace(
    new RegExp(`${ZOHO_INLINE_IMAGE_SCHEME}([^\\)\\s]+)`, 'g'),
    (match, encodedContentId) => {
      const contentId = decodeURIComponent(encodedContentId);

      return replacements[contentId] || '';
    },
  );
};

const stripReplyThread = (value) => {
  if (!_.isString(value)) {
    return value;
  }

  const lines = normalizeLineBreaks(value).split('\n');
  const separatorIndex = lines.findIndex((line) =>
    REPLY_SEPARATOR_PATTERNS.some((pattern) => pattern.test(normalizeMarkerLine(line))),
  );
  const relevantLines = separatorIndex >= 0 ? lines.slice(0, separatorIndex) : lines;

  return normalizeWhitespace(relevantLines.join('\n'));
};

const stripSignature = (value) => {
  if (!_.isString(value)) {
    return value;
  }

  const lines = normalizeLineBreaks(value).split('\n');
  const signatureIndex = lines.findIndex((line, index) => {
    if (index === 0) {
      return false;
    }

    return SIGNATURE_START_PATTERNS.some((pattern) => pattern.test(normalizeMarkerLine(line)));
  });
  const relevantLines = signatureIndex >= 0 ? lines.slice(0, signatureIndex) : lines;

  return normalizeWhitespace(relevantLines.join('\n'));
};

const getDescriptionSource = (payload) => {
  if (_.isString(payload.html) && payload.html.trim()) {
    return {
      source: 'html',
      value: htmlToMarkdown(payload.html),
    };
  }

  if (_.isString(payload.summary) && payload.summary.trim()) {
    return {
      source: 'summary',
      value: normalizeWhitespace(_.unescape(payload.summary)),
    };
  }

  if (_.isString(payload.content) && payload.content.trim()) {
    return {
      source: 'content',
      value: normalizeWhitespace(_.unescape(payload.content)),
    };
  }

  return {
    source: null,
    value: null,
  };
};

const getReplyDescriptionSource = (payload) => {
  const result = getDescriptionSource(payload);

  return {
    ...result,
    value: stripSignature(stripReplyThread(result.value)),
  };
};

const getDescription = (payload) => {
  const { value } = getDescriptionSource(payload);

  return value;
};

const getReplyDescription = (payload) => {
  const { value } = getReplyDescriptionSource(payload);

  return value;
};

const normalizeMessageId = (value) => {
  if (!_.isString(value)) {
    return null;
  }

  const normalized = value.trim().replace(/^<|>$/g, '').toLowerCase();

  return normalized || null;
};

const extractMessageIds = (...values) => {
  const result = new Set();

  values.filter(_.isString).forEach((value) => {
    let match = RFC_MESSAGE_ID_REGEX.exec(value);
    let hasRfcIds = false;

    while (match) {
      hasRfcIds = true;

      const normalized = normalizeMessageId(match[1]);
      if (normalized) {
        result.add(normalized);
      }

      match = RFC_MESSAGE_ID_REGEX.exec(value);
    }

    if (!hasRfcIds) {
      const directId = normalizeMessageId(value);
      if (directId) {
        result.add(directId);
      }
    }

    RFC_MESSAGE_ID_REGEX.lastIndex = 0;
  });

  return [...result];
};

const getHeaderValues = (headerContent, key) => {
  if (!_.isPlainObject(headerContent)) {
    return [];
  }

  const matchingKey = Object.keys(headerContent).find(
    (headerKey) => headerKey.toLowerCase() === key.toLowerCase(),
  );

  if (!matchingKey) {
    return [];
  }

  const value = headerContent[matchingKey];

  return Array.isArray(value) ? value : [];
};

const getThreadMessageIds = (payload, headerContent) => {
  const currentMessageIds = extractMessageIds(
    payload.messageIdString,
    _.isFinite(payload.messageId) ? String(payload.messageId) : payload.messageId,
    ...getHeaderValues(headerContent, 'Message-Id'),
  );

  const parentMessageIds = extractMessageIds(
    ...getHeaderValues(headerContent, 'In-Reply-To'),
    ...getHeaderValues(headerContent, 'References'),
  );

  return {
    currentMessageIds,
    parentMessageIds,
    isReply: parentMessageIds.length > 0,
  };
};

module.exports = {
  getDescription,
  getReplyDescription,
  getDescriptionSource,
  getReplyDescriptionSource,
  htmlToMarkdown,
  replaceInlineImagePlaceholders,
  extractMessageIds,
  getThreadMessageIds,
};
