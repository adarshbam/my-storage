import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";

const window = new JSDOM("").window;
const purify = DOMPurify(window);

/**
 * Sanitize a string value to prevent XSS attacks.
 * Strips all HTML/script tags, returning only safe plain text.
 *
 * @param {string} value - The untrusted input string.
 * @returns {string} The sanitized string (all HTML stripped).
 */
export function sanitize(value) {
  if (typeof value !== "string") return value;
  return purify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
