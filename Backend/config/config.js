import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, "../.env");

if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch (e) {
      console.warn("Could not load .env via process.loadEnvFile:", e.message);
    }
  } else {
    try {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          const val = trimmed.slice(eqIdx + 1).trim();
          if (!process.env[key]) {
            process.env[key] = val.replace(/^["']|["']$/g, "");
          }
        }
      }
    } catch (e) {
      console.warn("Could not parse .env manually:", e.message);
    }
  }
}

export const PORT = process.env.PORT || 4000;
export const DB_URL = process.env.DB_URL;
export const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
export const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
export const SESSION_SECRET =
  process.env.SESSION_SECRET || "vault-storageApp-123$";
export const BACKEND_URL =
  process.env.BACKEND_URL || `http://localhost:${PORT}`;

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
export const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
export const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
export const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

export const CLOUDFLARE_CDN_SECRET = process.env.CLOUDFLARE_CDN_SECRET;
export const CLOUDFLARE_CDN_DOMAIN = process.env.CLOUDFLARE_CDN_DOMAIN;

export const MAX_DEVICES_LIMIT =
  parseInt(process.env.MAX_DEVICES_LIMIT, 10) || 3;

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  signed: true,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const ROOT_DIR_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};
