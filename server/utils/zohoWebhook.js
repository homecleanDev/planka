const _ = require('lodash');

const HTML_BLOCK_BREAK_REGEX = /<(br\s*\/?|\/p|\/div|\/h[1-6]|\/tr|\/table|\/blockquote)>/gi;
const HTML_LIST_ITEM_REGEX = /<li\b[^>]*>/gi;
const HTML_LIST_ITEM_CLOSE_REGEX = /<\/li>/gi;
const HTML_TAG_REGEX = /<[^>]+>/g;
const REPLY_HEADER_REGEX = /^\s*(from:.*|sent:.*|to:.*|subject:.*|on .+ wrote:)\s*$/im;
const SIGNATURE_MARKER_REGEX = /^\s*(--\s*|__+\s*|sent from my .*)$/im;
const SIGN_OFF_REGEX = /^(thanks(?: and regards)?|best(?: regards| wishes)?|kind regards|regards|cheers|sincerely|warm regards)[,!]?\s*$/i;

const normalizeLineBreaks = (value) => value.replace(/\r\n?/g, '\n');

const normalizeWhitespace = (value) =>
  normalizeLineBreaks(value)
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const htmlToPlainText = (value) =>
  normalizeWhitespace(
    _.unescape(
      value
        .replace(HTML_LIST_ITEM_REGEX, '\n- ')
        .replace(HTML_LIST_ITEM_CLOSE_REGEX, '')
        .replace(HTML_BLOCK_BREAK_REGEX, '\n')
        .replace(/<\/td>\s*<td\b[^>]*>/gi, ' | ')
        .replace(HTML_TAG_REGEX, ' '),
    ),
  ).replace(/\n\n(?=- )/g, '\n');

const stripQuotedReply = (value) => {
  const match = REPLY_HEADER_REGEX.exec(value);

  if (!match) {
    return value;
  }

  return value.slice(0, match.index).trim();
};

const stripSignature = (value) => {
  const signatureMarker = SIGNATURE_MARKER_REGEX.exec(value);

  if (signatureMarker) {
    return value.slice(0, signatureMarker.index).trim();
  }

  const lines = value.split('\n');

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index].trim();

    if (!line) {
      continue;
    }

    if (SIGN_OFF_REGEX.test(line)) {
      return lines.slice(0, index).join('\n').trim();
    }
  }

  return value;
};

const cleanEmailText = (value) => stripSignature(stripQuotedReply(normalizeWhitespace(value)));

const getDescriptionSource = (payload) => {
  if (_.isString(payload.summary) && payload.summary.trim()) {
    return {
      source: 'summary',
      value: cleanEmailText(payload.summary),
    };
  }

  if (_.isString(payload.html) && payload.html.trim()) {
    return {
      source: 'html',
      value: cleanEmailText(htmlToPlainText(payload.html)),
    };
  }

  if (_.isString(payload.content) && payload.content.trim()) {
    return {
      source: 'content',
      value: cleanEmailText(payload.content),
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
  cleanEmailText,
  getDescription,
  getDescriptionSource,
  htmlToPlainText,
};
