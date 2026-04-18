export const GOOGLE_CLIENT_ID =
  "621477951745-lmj5ogqo7fkmd9sv50t97dj11kdjffpa.apps.googleusercontent.com";

export const GOOGLE_CLIENT_SECRET = `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`;

export const MAX_DEVICES_LIMIT = 3;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  signed: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const ROOT_DIR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
