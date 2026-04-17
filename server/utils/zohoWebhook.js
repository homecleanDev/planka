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

const normalizeLineBreaks = (value) => value.replace(/\r\n?/g, '\n');

const normalizeWhitespace = (value) =>
  normalizeLineBreaks(value)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const decodeHtmlEntities = (value) =>
  value.replace(/&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;/gi, (match) => HTML_ENTITY_MAP[match] || match);

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
    .replace(
      LINK_TAG_REGEX,
      (_, __, href, text) => `[${htmlFragmentToText(text) || href}](${decodeHtmlEntities(href)})`,
    )
    .replace(IMAGE_TAG_REGEX, (_, attrs) => {
      const srcMatch = attrs.match(/\bsrc=(['"])(.*?)\1/i);
      const altMatch = attrs.match(/\balt=(['"])(.*?)\1/i);
      const src = srcMatch ? decodeHtmlEntities(srcMatch[2]) : '';
      const alt = altMatch ? htmlFragmentToText(altMatch[2]) : 'image';

      return src ? `![${alt || 'image'}](${src})` : '';
    });

  return htmlFragmentToText(markdown);
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

const getDescription = (payload) => {
  const { value } = getDescriptionSource(payload);

  return value;
};

module.exports = {
  getDescription,
  getDescriptionSource,
  htmlToMarkdown,
};
