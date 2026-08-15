import parsePhoneNumberFromString from "libphonenumber-js";

/**
 * Validates and normalizes any phone number into canonical E.164 format (e.g. +919876543210).
 * Handles formatting variations like spaces, hyphens, parentheses, and leading zeroes.
 *
 * @param {string} rawPhone - Raw user-inputted phone number.
 * @param {string} [defaultCountry="IN"] - Default ISO country code if international prefix is omitted.
 * @returns {{ isValid: boolean, canonicalPhone: string|null, country: string|null, formatted: string|null, error: string|null }}
 */
export function normalizePhoneNumber(rawPhone, defaultCountry = "IN") {
  if (!rawPhone || typeof rawPhone !== "string") {
    return {
      isValid: false,
      canonicalPhone: null,
      country: null,
      formatted: null,
      error: "Phone number is required",
    };
  }

  const cleaned = rawPhone.trim();
  if (cleaned.length < 5) {
    return {
      isValid: false,
      canonicalPhone: null,
      country: null,
      formatted: null,
      error: "Phone number is too short",
    };
  }

  try {
    const phoneNumber = parsePhoneNumberFromString(cleaned, defaultCountry);

    if (!phoneNumber || !phoneNumber.isValid()) {
      return {
        isValid: false,
        canonicalPhone: null,
        country: null,
        formatted: null,
        error: "Please enter a valid phone number with country code",
      };
    }

    const canonicalPhone = phoneNumber.format("E.164"); // e.g. +919876543210
    const formatted = phoneNumber.formatInternational(); // e.g. +91 98765 43210
    const country = phoneNumber.country || defaultCountry;

    return {
      isValid: true,
      canonicalPhone,
      country,
      formatted,
      error: null,
    };
  } catch (err) {
    return {
      isValid: false,
      canonicalPhone: null,
      country: null,
      formatted: null,
      error: "Failed to parse phone number format",
    };
  }
}
