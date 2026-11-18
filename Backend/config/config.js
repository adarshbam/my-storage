import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isTestEnvironment = process.env.NODE_ENV === "test";

const envPath = path.resolve(
  __dirname,
  isTestEnvironment ? "../.env.test" : "../.env",
);

if (isTestEnvironment && !fs.existsSync(envPath)) {
  throw new Error("Test environment file .env.test is missing!");
}

// Expected test-only connection targets
if (fs.existsSync(envPath)) {
  const EXPECTED_TEST_DB = "mongodb://127.0.0.1:27018/vault_test";
  const EXPECTED_TEST_REDIS = "redis://127.0.0.1:6380";

  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(envPath);
    } catch (e) {
      if (isTestEnvironment) throw e;
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
      if (isTestEnvironment) throw e;
      console.warn("Could not parse .env manually:", e.message);
    }
  }

  if (
    isTestEnvironment &&
    process.env.BACKBLAZE_ENDPOINT !== "http://127.0.0.1:5001"
  ) {
    throw new Error("Unsafe test S3 endpoint");
  }

  if (process.env.BACKBLAZE_ACCESS_KEY_ID !== "test") {
    throw new Error("Unsafe test S3 access key");
  }

  if (isTestEnvironment) {
    if (process.env.DB_URL !== EXPECTED_TEST_DB) {
      throw new Error("Unsafe test MongoDB connection");
    }

    if (process.env.REDIS_URL !== EXPECTED_TEST_REDIS) {
      throw new Error("Unsafe test Redis connection");
    }

    if (
      !process.env.SESSION_SECRET ||
      process.env.SESSION_SECRET === "vault-storageApp-123$"
    ) {
      throw new Error("A dedicated test session secret is required");
    }

    // Only allow the local Moto S3 configuration during tests.
    if (process.env.BACKBLAZE_REGION !== "us-east-1") {
      throw new Error("Unsafe test S3 region");
    }

    if (process.env.BACKBLAZE_ACCESS_KEY_ID !== "test") {
      throw new Error("Unsafe test S3 access key");
    }

    if (process.env.BACKBLAZE_SECRET_ACCESS_KEY !== "test") {
      throw new Error("Unsafe test S3 secret key");
    }

    if (process.env.BACKBLAZE_BUCKET_NAME !== "vault-test-local") {
      throw new Error("Unsafe test S3 bucket");
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

// Special Demonstration & Verification Accounts
export const GOOGLE_TESTER_EMAIL = (
  process.env.GOOGLE_TESTER_EMAIL || "google-reviewer@yourvaultstorage.com"
)
  .toLowerCase()
  .trim();
export const GOOGLE_TESTER_PASSWORD =
  process.env.GOOGLE_TESTER_PASSWORD || "VaultReviewer2026!";
export const GOOGLE_TESTER_NAME =
  process.env.GOOGLE_TESTER_NAME || "Google App Reviewer";

export const RECRUITER_EMAIL = (
  process.env.RECRUITER_EMAIL || "recruiter@yourvaultstorage.com"
)
  .toLowerCase()
  .trim();
export const RECRUITER_PASSWORD =
  process.env.RECRUITER_PASSWORD || "VaultRecruiter2026!";
export const RECRUITER_NAME =
  process.env.RECRUITER_NAME || "Recruiter Portfolio Demo";

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
