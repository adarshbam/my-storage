import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const sourceConfig = fileURLToPath(
  new URL("../../config/config.js", import.meta.url),
);

const testEnvContents = [
  "NODE_ENV=test",
  "DB_URL=mongodb://127.0.0.1:27018/vault_test?replicaSet=rs0&directConnection=true",
  "REDIS_URL=redis://127.0.0.1:6380",
  "SESSION_SECRET=isolated-unit-test-secret-123456789",

  "BACKBLAZE_ENDPOINT=http://127.0.0.1:5001",
  "BACKBLAZE_REGION=us-east-1",
  "BACKBLAZE_ACCESS_KEY_ID=test",
  "BACKBLAZE_SECRET_ACCESS_KEY=test",
  "BACKBLAZE_BUCKET_NAME=vault-test-local",
].join("\n");

function runConfig(overrides = {}, includeEnvFile = true) {
  // Create a completely separate temporary environment.
  const root = mkdtempSync(join(tmpdir(), "vault-config-test-"));
  const configDir = join(root, "config");
  const configPath = join(configDir, "config.mjs");

  try {
    mkdirSync(configDir);

    // Copy only config.js, not the real Backend/.env.
    copyFileSync(sourceConfig, configPath);

    if (includeEnvFile) {
      writeFileSync(join(root, ".env.test"), testEnvContents, "utf8");
    }

    const env = {
      ...process.env,
      NODE_ENV: "test",
    };

    // Prevent inherited database settings from affecting the fixture.
    delete env.DB_URL;
    delete env.REDIS_URL;
    delete env.SESSION_SECRET;
    delete env.BACKBLAZE_ENDPOINT;
    delete env.BACKBLAZE_REGION;
    delete env.BACKBLAZE_ACCESS_KEY_ID;
    delete env.BACKBLAZE_SECRET_ACCESS_KEY;
    delete env.BACKBLAZE_BUCKET_NAME;

    Object.assign(env, overrides);

    // Run the configuration module in a separate process.
    // No application server or database module is imported.
    return spawnSync(process.execPath, [configPath], {
      cwd: root,
      env,
      encoding: "utf8",
      windowsHide: true,
      timeout: 5000,
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("accepts valid isolated test configuration", () => {
  const result = runConfig();

  assert.equal(result.status, 0, result.stderr);
});

test("rejects missing .env.test", () => {
  const result = runConfig({}, false);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Test environment file.*missing/i);
});

test("rejects an unsafe MongoDB connection", () => {
  const result = runConfig({
    DB_URL: "mongodb+srv://production.example.invalid/vault",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe test MongoDB connection/);
});

test("rejects an unsafe Redis connection", () => {
  const result = runConfig({
    REDIS_URL: "redis://production.example.invalid:6379",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe test Redis connection/);
});

test("rejects the default session secret", () => {
  const result = runConfig({
    SESSION_SECRET: "vault-storageApp-123$",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /dedicated test session secret is required/);
});

test("rejects an unsafe S3 endpoint", () => {
  const result = runConfig({
    BACKBLAZE_ENDPOINT: "https://production.example.invalid",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe test S3 endpoint/);
});

test("rejects production S3 credentials", () => {
  const result = runConfig({
    BACKBLAZE_ACCESS_KEY_ID: "production-key",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Unsafe test S3 access key/);
});
