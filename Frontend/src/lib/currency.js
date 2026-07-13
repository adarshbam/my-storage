// Base prices in INR as specified by the user
export const basePrices = {
  Novice: { monthly: 199, yearly: 1999 },
  Professional: { monthly: 399, yearly: 3999 },
  Ultimate: { monthly: 999, yearly: 9999 }
};

export const currencySymbols = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  AUD: "A$",
  CAD: "C$",
  NZD: "NZ$",
  CNY: "¥",
  CHF: "CHF",
  ZAR: "R",
  BRL: "R$",
  RUB: "₽",
  KRW: "₩",
  SGD: "S$",
  MXN: "Mex$",
  AED: "AED",
  SAR: "SR",
};

export const supportedCountries = [
  { code: "AUTO", name: "Auto-detect (Local)", currency: "AUTO" },
  { code: "IN", name: "India (₹ INR)", currency: "INR" },
  { code: "US", name: "United States ($ USD)", currency: "USD" },
  { code: "EU", name: "Europe (€ EUR)", currency: "EUR" },
  { code: "GB", name: "United Kingdom (£ GBP)", currency: "GBP" },
  { code: "JP", name: "Japan (¥ JPY)", currency: "JPY" },
  { code: "AU", name: "Australia (A$ AUD)", currency: "AUD" },
  { code: "CA", name: "Canada (C$ CAD)", currency: "CAD" },
];

export const fallbackRates = {
  INR: 1.0,
  USD: 0.012,   // 1 INR = 0.012 USD
  EUR: 0.011,   // 1 INR = 0.011 EUR
  GBP: 0.0093,  // 1 INR = 0.0093 GBP
  JPY: 1.90,    // 1 INR = 1.90 JPY
  AUD: 0.018,   // 1 INR = 0.018 AUD
  CAD: 0.016,   // 1 INR = 0.016 CAD
};

/**
 * Rounds converted prices to standard professional price points.
 * - INR: Keeps original requested numbers (199, 1999, 399, 3999, 999, 9999)
 * - JPY: Rounds to nearest 10 or 50 JPY
 * - Others: Rounds to end in .49, .99, or whole numbers.
 */
export function getRoundedPrice(val, currency) {
  if (currency === "INR") return val;

  if (currency === "JPY") {
    return Math.round(val / 50) * 50;
  }

  if (val <= 0) return 0;
  if (val < 1) return 0.99;

  if (val < 10) {
    const integerPart = Math.floor(val);
    const fraction = val - integerPart;
    if (fraction < 0.25) {
      return integerPart - 0.01;
    } else if (fraction < 0.75) {
      return integerPart + 0.49;
    } else {
      return integerPart + 0.99;
    }
  }

  if (val < 100) {
    return Math.round(val) - 0.01;
  }

  // Round to nearest 5 - 0.01 for values >= 100
  return Math.round(val / 5) * 5 - 0.01;
}

/**
 * Detects local currency based on browser timezone and locale fallback.
 */
export function detectLocalCurrencyFallback() {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const locale = navigator.language || "";

    if (timeZone.includes("Kolkata") || timeZone.includes("Calcutta") || locale.includes("IN")) {
      return "INR";
    }
    if (timeZone.includes("London") || locale.includes("GB")) {
      return "GBP";
    }
    if (timeZone.includes("Europe") || locale.includes("EU") || locale.includes("fr") || locale.includes("de") || locale.includes("it") || locale.includes("es")) {
      return "EUR";
    }
    if (timeZone.includes("Tokyo") || locale.includes("JP")) {
      return "JPY";
    }
    if (timeZone.includes("Australia") || locale.includes("AU")) {
      return "AUD";
    }
    if (timeZone.includes("Canada") || locale.includes("CA")) {
      return "CAD";
    }
    return "USD"; // Default fallback
  } catch (e) {
    return "USD";
  }
}
