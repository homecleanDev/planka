/**
 * Checks if a URL points to an image file.
 *
 * @param {string} url - The URL to check
 * @returns {boolean} - True if the URL points to an image file, false otherwise
 */
const isImage = (url) => {
  if (!url) return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url);
};

export default isImage;
