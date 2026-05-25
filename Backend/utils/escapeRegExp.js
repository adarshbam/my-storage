/**
 * Safely escapes all special regular expression characters in a string.
 * This prevents Regular Expression Denial of Service (ReDoS) and search pattern bypassing
 * when passing user input directly into a Mongoose/MongoDB $regex query.
 * 
 * @param {string} string - The raw user input string to escape.
 * @returns {string} The escaped string safe for RegExp use.
 */
export const escapeRegExp = (string) => {
  if (typeof string !== "string") return "";
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
