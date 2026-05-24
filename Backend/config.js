export const PORT = process.env.PORT || 4000;
export const DB_URL = process.env.DB_URL;
export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
export const SESSION_SECRET = process.env.SESSION_SECRET || "vault-storageApp-123$";
export const BACKEND_URL = process.env.BACKEND_URL || `https://localhost:${PORT}`;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

export const MAX_DEVICES_LIMIT = parseInt(process.env.MAX_DEVICES_LIMIT, 10) || 3;

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
