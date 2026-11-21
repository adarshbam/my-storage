import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import mongoose from "mongoose";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

// ============================================================
// 1. STRICT TEST ENVIRONMENT
// ============================================================

if (process.env.NODE_ENV !== "test") {
  throw new Error("Integration tests require NODE_ENV=test");
}

await import("../../config/config.js");

const BASE_URL = "http://127.0.0.1:4100";
const S3_ENDPOINT = "http://127.0.0.1:5001";
const BUCKET = "vault-test-local";

const EXPECTED_DB =
  "mongodb://127.0.0.1:27018/vault_test?replicaSet=rs0&directConnection=true";

if (
  process.env.DB_URL !== EXPECTED_DB ||
  process.env.REDIS_URL !== "redis://127.0.0.1:6380" ||
  process.env.BACKBLAZE_ENDPOINT !== S3_ENDPOINT ||
  process.env.BACKBLAZE_BUCKET_NAME !== BUCKET ||
  process.env.BACKBLAZE_ACCESS_KEY_ID !== "test" ||
  process.env.BACKBLAZE_SECRET_ACCESS_KEY !== "test"
) {
  throw new Error(
    "Unsafe integration environment: expected isolated MongoDB, Redis and Moto S3",
  );
}

// ============================================================
// 2. UTILITIES
// ============================================================

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function extractCookies(response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";")[0])
    .join("; ");
}

function assertLocalS3Url(rawUrl) {
  assert.equal(typeof rawUrl, "string");

  const url = new URL(rawUrl);

  assert.equal(url.protocol, "http:");
  assert.ok(
    ["127.0.0.1", "localhost"].includes(url.hostname),
    `Unsafe S3 hostname: ${url.hostname}`,
  );
  assert.equal(url.port, "5001", "S3 must use local Moto port 5001");
  assert.equal(url.username, "");
  assert.equal(url.password, "");

  return url.href;
}

async function apiRequest(method, path, options = {}) {
  const { cookie, body } = options;

  const headers = {};

  if (cookie) {
    headers.Cookie = cookie;
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return {
    status: response.status,
    response,
    data,
  };
}

function expectStatus(result, expected, operation) {
  assert.equal(
    result.status,
    expected,
    `${operation} failed (${result.status}): ${JSON.stringify(result.data)}`,
  );
}

// ============================================================
// 3. PREPARE LOCAL S3
// ============================================================

async function ensureTestBucket() {
  const client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
  });

  try {
    try {
      await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) {
        throw error;
      }

      await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
    }
  } finally {
    client.destroy();
  }
}

// ============================================================
// 4. CREATE ISOLATED SUBSCRIPTION FIXTURES
// ============================================================

async function createTestSubscription(email) {
  if (process.env.NODE_ENV !== "test" || process.env.DB_URL !== EXPECTED_DB) {
    throw new Error("Refusing to modify a non-test MongoDB");
  }

  const [
    { default: User },
    { default: Subscription },
    { default: BillingPlan },
    { default: PlanTier },
    { default: PlanTierConfiguration },
  ] = await Promise.all([
    import("../../models/userModel.js"),
    import("../../models/subscriptionModel.js"),
    import("../../models/billingPlanModel.js"),
    import("../../models/planTierModel.js"),
    import("../../models/planTierConfigurationModel.js"),
  ]);

  await mongoose.connect(EXPECTED_DB);

  try {
    const user = await User.findOne({ email });

    assert.ok(user, "Disposable test user was not found");

    const slug = `vault-integrity-${randomUUID()}`;
    const storageLimit = 64 * 1024 * 1024;

    // A. Plan tier
    const tier = await PlanTier.create({
      slug,
      title: "Vault Integration Test",
      description: "Local integration testing only",
      active: true,
    });

    // B. Tier permissions and limits
    await PlanTierConfiguration.create({
      tier: tier._id,
      slug,
      features: [],
      rules: {
        permissions: {
          allowUpload: true,
          allowDownload: true,
          allowSharing: false,
        },
        limits: {
          storageLimit,
          maxUploadFileSize: 8 * 1024 * 1024,
          maxConnectedDevices: 3,
        },
        settings: {
          uploadSpeedMultiplier: 1,
          versionHistoryDays: 0,
          deleteFilesAfterExpiryDays: 30,
        },
      },
    });

    // C. Billing plan (local fixture, not a Razorpay product)
    const billingPlan = await BillingPlan.create({
      tier: tier._id,
      slug,
      period: "Monthly",
      amount: 499,
      currency: "INR",
      storage: storageLimit,
      razorpayPlanId: `local_test_${randomUUID()}`,
      active: true,
    });

    // D. Active subscription
    const now = new Date();
    const end = new Date(now.getTime() + 30 * 86400000);

    const subscription = await Subscription.create({
      userId: user._id,
      billingPlan: billingPlan._id,
      razorpaySubscriptionId: `local_test_${randomUUID()}`,
      amount: billingPlan.amount,
      status: "active",
      isFreeTrial: false,
      activatedAt: now,
      currentStart: now,
      currentEnd: end,
      currentPeriodStart: now,
      currentPeriodEnd: end,
      chargeAt: end,
    });

    // E. Link subscription to user
    const result = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          subscription: subscription._id,
          maxStorage: storageLimit,
          noSubscriptionSince: null,
          noPlanSince: null,
        },
      },
    );

    assert.equal(result.matchedCount, 1);

    console.log("PASS: Isolated subscription configured");
  } finally {
    await mongoose.disconnect();
  }
}

// ============================================================
// 5. UPLOAD FILE BY PRESIGNED URL
// ============================================================

async function uploadToLocalS3(signedUrl, buffer, contentType) {
  const safeUrl = assertLocalS3Url(signedUrl);

  const response = await fetch(safeUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: buffer,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  if (![200, 201, 204].includes(response.status)) {
    const errorBody = await response.text();

    throw new Error(`Moto S3 upload failed (${response.status}): ${errorBody}`);
  }
}

// ============================================================
// 6. DOWNLOAD FILE
// ============================================================

async function fetchLocalS3Bytes(rawUrl) {
  const safeUrl = assertLocalS3Url(rawUrl);

  const response = await fetch(safeUrl, {
    method: "GET",
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  if (response.status !== 200) {
    const body = await response.text();

    throw new Error(`Moto S3 download failed (${response.status}): ${body}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function downloadFile(fileId, cookie) {
  const response = await fetch(`${BASE_URL}/file/${fileId}/download`, {
    method: "GET",
    headers: { Cookie: cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  // Vault may redirect to a presigned download URL.
  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");

    assert.ok(location, "Download redirect is missing Location");

    const resolvedUrl = new URL(location, `${BASE_URL}/file/${fileId}/download`)
      .href;

    return fetchLocalS3Bytes(resolvedUrl);
  }

  // IMPORTANT: Only consume the response body on error.
  if (response.status !== 200) {
    const errorBody = await response.text();

    throw new Error(`Vault download failed (${response.status}): ${errorBody}`);
  }

  const contentType = response.headers.get("content-type") || "";

  // Vault may return a JSON object with a download URL.
  if (contentType.includes("application/json")) {
    const data = await response.json();

    const downloadUrl =
      data?.signedUrl ||
      data?.downloadUrl ||
      data?.signedDownloadUrl ||
      data?.url ||
      data?.data?.signedUrl ||
      data?.data?.downloadUrl ||
      data?.data?.url;

    assert.ok(
      downloadUrl,
      `Unrecognized Vault download response: ${JSON.stringify(data)}`,
    );

    return fetchLocalS3Bytes(downloadUrl);
  }

  // Otherwise, Vault may stream binary data directly.
  return Buffer.from(await response.arrayBuffer());
}

// ============================================================
// 7. COMPLETE INTEGRATION TEST
// ============================================================

test("Vault upload → download → SHA-256 integrity", async () => {
  await ensureTestBucket();

  const id = randomUUID();
  const email = `vault-file-${id}@example.invalid`;
  const filename = `vault-integrity-${id}.bin`;
  const original = randomBytes(4096);
  const contentType = "application/octet-stream";

  // STEP 1: Register disposable user.
  const registration = await apiRequest("POST", "/user/register", {
    body: {
      name: "Vault File Integrity Test",
      email,
      password: "Vault!Test2026#Strong",
    },
  });

  expectStatus(registration, 201, "Registration");

  const cookie = extractCookies(registration.response);

  assert.match(
    cookie,
    /(?:^|;\s*)sessionId=/,
    "Registration did not establish a session",
  );

  console.log("PASS: Disposable user authenticated");

  // STEP 2: Establish a valid test subscription.
  await createTestSubscription(email);

  // STEP 3: Initiate the upload.
  const initiation = await apiRequest("POST", "/file/upload-vault/initiate", {
    cookie,
    body: {
      name: filename,
      size: original.length,
      contentType,
    },
  });

  expectStatus(initiation, 200, "Upload initiation");

  const { fileId, signedUrl, fileName } = initiation.data;

  assert.match(fileId, /^[a-f0-9]{24}$/i, "Invalid file ID returned by Vault");

  assert.ok(signedUrl, "Upload initiation returned no signed URL");
  assert.ok(fileName, "Upload initiation returned no storage key");

  // Validate the signed destination before proceeding.
  assertLocalS3Url(signedUrl);

  console.log("PASS: Upload initiated");

  // STEP 4: Upload bytes directly to Moto S3.
  await uploadToLocalS3(signedUrl, original, contentType);

  console.log("PASS: File uploaded to Moto S3");

  // STEP 5: Complete upload.
  const completion = await apiRequest("POST", "/file/upload-vault/complete", {
    cookie,
    body: {
      fileId,
      key: fileName,
    },
  });

  expectStatus(completion, 200, "Upload completion");

  console.log("PASS: Upload completed");

  // STEP 6: Download the actual file.
  const downloaded = await downloadFile(fileId, cookie);

  console.log("PASS: File downloaded");

  // STEP 7: Compare original and downloaded bytes.
  assert.equal(
    downloaded.length,
    original.length,
    "Downloaded file has a different size",
  );

  const originalHash = sha256(original);
  const downloadedHash = sha256(downloaded);

  assert.equal(
    downloadedHash,
    originalHash,
    "SHA-256 mismatch: downloaded file is corrupted",
  );

  console.log("PASS: SHA-256 integrity verified");
  console.log(`Verified bytes: ${original.length}`);
  console.log(`SHA-256: ${originalHash}`);
});
