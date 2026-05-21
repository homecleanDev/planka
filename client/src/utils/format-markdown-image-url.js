export default (url) => {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) {
    return '';
  }

  // Encode spaces/unicode while keeping URL structure intact.
  const encodedUrl = encodeURI(cleanUrl);

  // Use markdown angle-bracket URL form so special chars don't break parsing.
  return `<${encodedUrl}>`;
};
