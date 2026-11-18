/**
 * Safely escapes all special regular expression characters in a string.
 * This prevents Regular Expression Denial of Service (ReDoS) and search pattern bypassing
 * when passing user input directly into a Mongoose/MongoDB $regex query.
 *
 * @param {value} value - The raw user input string to escape.
 * @returns {value} The escaped string safe for RegExp use.
 */
export const escapeRegExp = (value: unknown): string => {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
