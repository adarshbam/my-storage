import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import mongoose from "mongoose";
import {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// Only run against Vault's isolated local test environment.
if (process.env.NODE_ENV !== "test") {
  throw new Error("NODE_ENV=test is required");
}

await import("../../config/config.js");

const DB_URL =
  "mongodb://127.0.0.1:27018/vault_test?replicaSet=rs0&directConnection=true";

const S3_URL = "http://127.0.0.1:5001";
const BUCKET = "vault-test-local";
const API = "http://127.0.0.1:4100";

if (
  process.env.DB_URL !== DB_URL ||
  process.env.REDIS_URL !== "redis://127.0.0.1:6380" ||
  process.env.BACKBLAZE_ENDPOINT !== S3_URL ||
  process.env.BACKBLAZE_BUCKET_NAME !== BUCKET ||
  process.env.BACKBLAZE_ACCESS_KEY_ID !== "test" ||
  process.env.BACKBLAZE_SECRET_ACCESS_KEY !== "test"
) {
  throw new Error("Refusing to use anything except isolated test services");
}

const s3 = new S3Client({
  endpoint: S3_URL,
  region: "us-east-1",
  forcePathStyle: true,
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

const oid = (id) => new mongoose.Types.ObjectId(String(id));

const hash = (buffer) => createHash("sha256").update(buffer).digest("hex");

const cookies = (res) =>
  res.headers
    .getSetCookie()
    .map((s) => s.split(";")[0])
    .join("; ");

function localS3(url) {
  const parsed = new URL(url);

  assert.equal(parsed.protocol, "http:");

  assert.ok(
    ["localhost", "127.0.0.1"].includes(parsed.hostname),
    "Non-local S3 URL refused",
  );

  assert.equal(parsed.port, "5001");
  assert.equal(parsed.username, "");
  assert.equal(parsed.password, "");

  return parsed.href;
}

async function request(method, path, { cookie, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  const text = await response.text();

  let data = text;

  try {
    data = JSON.parse(text);
  } catch {
    // Plain-text response.
  }

  return {
    response,
    status: response.status,
    data,
  };
}

function status(result, expected, step) {
  assert.equal(
    result.status,
    expected,
    `${step}: HTTP ${result.status}: ${JSON.stringify(result.data)}`,
  );
}

async function ensureBucket() {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err) {
    if (err.$metadata?.httpStatusCode !== 404) {
      throw err;
    }

    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
  }
}

async function register(email) {
  const result = await request("POST", "/user/register", {
    body: {
      name: "Vault Management Test",
      email,
      password: "Vault!Test2026#Strong",
    },
  });

  status(result, 201, `Register ${email}`);

  const cookie = cookies(result.response);

  assert.match(cookie, /(?:^|;\s*)sessionId=/);

  return cookie;
}

async function loadModels() {
  const [user, subscription, billingPlan, tier, config] = await Promise.all([
    import("../../models/userModel.js"),
    import("../../models/subscriptionModel.js"),
    import("../../models/billingPlanModel.js"),
    import("../../models/planTierModel.js"),
    import("../../models/planTierConfigurationModel.js"),
  ]);

  return {
    User: user.default,
    Subscription: subscription.default,
    BillingPlan: billingPlan.default,
    PlanTier: tier.default,
    PlanTierConfiguration: config.default,
  };
}

async function seedEntitlements(models, emails, slug) {
  const { User, Subscription, BillingPlan, PlanTier, PlanTierConfiguration } =
    models;

  const accounts = await User.find({
    email: { $in: emails },
  });

  assert.equal(accounts.length, 2, "Both disposable accounts must exist");

  const tier = await PlanTier.create({
    slug,
    title: "Vault Management Test",
    description: "Test-only plan",
    active: true,
  });

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
        storageLimit: 64 * 1024 ** 2,
        maxUploadFileSize: 8 * 1024 ** 2,
        maxConnectedDevices: 3,
      },
      settings: {
        uploadSpeedMultiplier: 1,
        versionHistoryDays: 0,
        deleteFilesAfterExpiryDays: 30,
      },
    },
  });

  const plan = await BillingPlan.create({
    tier: tier._id,
    slug,
    period: "Monthly",
    amount: 499,
    currency: "INR",
    storage: 64 * 1024 ** 2,
    razorpayPlanId: `local_test_${randomUUID()}`,
    active: true,
  });

  for (const user of accounts) {
    const now = new Date();

    const end = new Date(now.getTime() + 30 * 86400000);

    const sub = await Subscription.create({
      userId: user._id,
      billingPlan: plan._id,
      razorpaySubscriptionId: `local_test_${randomUUID()}`,
      amount: plan.amount,
      status: "active",
      isFreeTrial: false,
      activatedAt: now,
      currentStart: now,
      currentEnd: end,
      currentPeriodStart: now,
      currentPeriodEnd: end,
      chargeAt: end,
    });

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          subscription: sub._id,
          maxStorage: plan.storage,
          noSubscriptionSince: null,
          noPlanSince: null,
        },
      },
    );
  }

  return accounts;
}

async function readDownloaded(fileId, cookie) {
  const response = await fetch(`${API}/file/${fileId}/download`, {
    headers: { Cookie: cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  let url;

  if ([301, 302, 303, 307, 308].includes(response.status)) {
    const location = response.headers.get("location");

    assert.ok(location, "Download redirect missing Location");

    url = new URL(location, API).href;
  } else if (response.status === 200) {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      return Buffer.from(await response.arrayBuffer());
    }

    const data = await response.json();

    url =
      data?.signedUrl ||
      data?.downloadUrl ||
      data?.url ||
      data?.data?.signedUrl ||
      data?.data?.downloadUrl ||
      data?.data?.url;

    assert.ok(url, `Unexpected download JSON: ${JSON.stringify(data)}`);
  } else {
    throw new Error(
      `Download HTTP ${response.status}: ${await response.text()}`,
    );
  }

  const storage = await fetch(localS3(url), {
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  if (storage.status !== 200) {
    throw new Error(
      `Moto download HTTP ${storage.status}: ${await storage.text()}`,
    );
  }

  return Buffer.from(await storage.arrayBuffer());
}

// ============================================================
// COMPLETE FILE MANAGEMENT INTEGRATION TEST
// ============================================================

test("Vault rename → nested move → ownership → trash → restore", async (t) => {
  const token = randomUUID();

  const emails = [
    `vault-owner-${token}@example.invalid`,
    `vault-other-${token}@example.invalid`,
  ];

  const slug = `vault-management-${token}`;
  const filename = `management-${token}.bin`;
  const renamed = `renamed-${token}.bin`;
  const folderA = `outer-${token}`;
  const folderB = `inner-${token}`;

  const bytes = randomBytes(4096);
  const contentType = "application/octet-stream";

  const created = {
    fileId: null,
    fileName: null,
    folderIds: [],
    cookies: [],
  };

  // Cleanup only disposable test records.
  t.after(async () => {
    for (const cookie of created.cookies) {
      try {
        await request("POST", "/user/logout", {
          cookie,
        });
      } catch (error) {
        console.warn("Logout cleanup:", error.message);
      }
    }

    try {
      if (created.fileName) {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: created.fileName,
          }),
        );
      }

      if (mongoose.connection.readyState !== 1) {
        await mongoose.connect(DB_URL);
      }

      const models = await loadModels();

      const users = await models.User.find({
        email: { $in: emails },
      })
        .select("_id rootDirId")
        .lean();

      const userIds = users.map((u) => u._id);

      const dirIds = [...created.folderIds, ...users.map((u) => u.rootDirId)]
        .filter(Boolean)
        .map(oid);

      if (created.fileId) {
        await mongoose.connection.db.collection("files").deleteOne({
          _id: oid(created.fileId),
        });
      }

      if (dirIds.length) {
        await mongoose.connection.db.collection("directories").deleteMany({
          _id: { $in: dirIds },
        });
      }

      if (userIds.length) {
        await models.Subscription.deleteMany({
          userId: { $in: userIds },
        });

        await mongoose.connection.db.collection("sessions").deleteMany({
          userId: { $in: userIds },
        });

        await models.User.deleteMany({
          _id: { $in: userIds },
        });
      }

      await models.BillingPlan.deleteMany({
        slug,
      });

      await models.PlanTierConfiguration.deleteMany({
        slug,
      });

      await models.PlanTier.deleteMany({
        slug,
      });
    } finally {
      if (mongoose.connection.readyState) {
        await mongoose.disconnect();
      }

      s3.destroy();
    }
  });

  // 1. Prepare isolated test services.
  await ensureBucket();

  created.cookies.push(await register(emails[0]));

  created.cookies.push(await register(emails[1]));

  await mongoose.connect(DB_URL);

  const models = await loadModels();

  const accounts = await seedEntitlements(models, emails, slug);

  const owner = accounts.find((u) => u.email === emails[0]);

  assert.ok(owner?.rootDirId, "Owner has no root directory");

  const ownerCookie = created.cookies[0];
  const otherCookie = created.cookies[1];

  console.log("PASS: Two users have isolated test plans");

  const dirs = mongoose.connection.db.collection("directories");

  const files = mongoose.connection.db.collection("files");

  // 2. Create outer folder.
  const createOuter = await request("POST", "/directory/", {
    cookie: ownerCookie,
    body: {
      foldername: folderA,
    },
  });

  status(createOuter, 201, "Create outer folder");

  const outer = await dirs.findOne({
    name: folderA,
  });

  assert.ok(outer?._id, "Outer folder not found");

  created.folderIds.push(outer._id);

  // 3. Create nested folder.
  const createInner = await request("POST", `/directory/${outer._id}`, {
    cookie: ownerCookie,
    body: {
      foldername: folderB,
    },
  });

  status(createInner, 201, "Create nested folder");

  const inner = await dirs.findOne({
    name: folderB,
  });

  assert.ok(inner?._id, "Nested folder not found");

  created.folderIds.push(inner._id);

  console.log("PASS: Nested folders created");

  // 4. Initiate file upload.
  const start = await request("POST", "/file/upload-vault/initiate", {
    cookie: ownerCookie,
    body: {
      name: filename,
      size: bytes.length,
      contentType,
    },
  });

  status(start, 200, "Initiate file upload");

  const { fileId, signedUrl, fileName } = start.data;

  assert.match(fileId, /^[\da-f]{24}$/i);

  assert.ok(signedUrl && fileName, "Missing upload URL or storage key");

  created.fileId = fileId;
  created.fileName = fileName;

  // 5. Upload bytes to local Moto.
  const upload = await fetch(localS3(signedUrl), {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    body: bytes,
    redirect: "manual",
    signal: AbortSignal.timeout(15000),
  });

  if (![200, 201, 204].includes(upload.status)) {
    throw new Error(`Moto PUT ${upload.status}: ${await upload.text()}`);
  }

  // 6. Complete upload.
  const complete = await request("POST", "/file/upload-vault/complete", {
    cookie: ownerCookie,
    body: {
      fileId,
      key: fileName,
    },
  });

  status(complete, 200, "Complete file upload");

  const originalHash = hash(bytes);

  assert.equal(hash(await readDownloaded(fileId, ownerCookie)), originalHash);

  console.log("PASS: File uploaded with byte integrity");

  // 7. Rename file.
  const rename = await request("PATCH", `/file/${fileId}`, {
    cookie: ownerCookie,
    body: {
      newFileName: renamed,
    },
  });

  status(rename, 200, "Rename file");

  let metadata = await files.findOne({
    _id: oid(fileId),
  });

  assert.equal(metadata?.name, renamed);
  assert.equal(metadata?.size, bytes.length);

  console.log("PASS: Rename persisted");

  // 8. Move file into nested folder.
  const move = await request("PATCH", `/directory/${inner._id}/move`, {
    cookie: ownerCookie,
    body: [
      {
        _id: fileId,
        type: "file",
      },
    ],
  });

  status(move, 200, "Move file into nested folder");

  metadata = await files.findOne({
    _id: oid(fileId),
  });

  assert.equal(String(metadata?.parentDir), String(inner._id));

  assert.equal(metadata?.name, renamed);
  assert.equal(metadata?.size, bytes.length);

  console.log("PASS: Nested move persisted");

  // 9. Verify cross-user ownership protection.
  const forbidden = await request("PATCH", `/file/${fileId}`, {
    cookie: otherCookie,
    body: {
      newFileName: `intrusion-${token}.bin`,
    },
  });

  assert.ok(
    [403, 404].includes(forbidden.status),
    `Cross-user rename was not rejected: HTTP ${forbidden.status} ${JSON.stringify(forbidden.data)}`,
  );

  metadata = await files.findOne({
    _id: oid(fileId),
  });

  assert.equal(metadata?.name, renamed, "Other user changed owner's filename");

  console.log("PASS: Cross-user rename denied");

  // 10. Capture folder state.
  const beforeTrash = await dirs.findOne({
    _id: inner._id,
  });

  // 11. Move file to trash.
  const deletion = await request("DELETE", `/file/${fileId}`, {
    cookie: ownerCookie,
  });

  status(deletion, 200, "Trash file");

  const trash = await request("GET", "/trash/", {
    cookie: ownerCookie,
  });

  status(trash, 200, "List trash");

  assert.ok(
    JSON.stringify(trash.data).includes(fileId),
    "Deleted file absent from trash listing",
  );

  console.log("PASS: File appears in trash");

  // 12. Restore the file.
  const restore = await request("POST", `/trash/${fileId}/restore`, {
    cookie: ownerCookie,
  });

  status(restore, 201, "Restore file");

  metadata = await files.findOne({
    _id: oid(fileId),
  });

  assert.ok(metadata, "Restored file not found");

  assert.equal(metadata.name, renamed);
  assert.equal(metadata.size, bytes.length);

  // 13. Verify integrity after restoration.
  assert.equal(
    hash(await readDownloaded(fileId, ownerCookie)),
    originalHash,
    "Restored file has different content",
  );

  // 14. Verify applicable folder-size consistency.
  const afterRestore = await dirs.findOne({
    _id: inner._id,
  });

  if (
    String(metadata.parentDir) === String(inner._id) &&
    typeof beforeTrash?.size === "number" &&
    typeof afterRestore?.size === "number"
  ) {
    assert.equal(
      afterRestore.size,
      beforeTrash.size,
      "Directory size changed after trash/restore cycle",
    );
  }

  // 15. Confirm restored file is no longer in trash.
  const restoredTrash = await request("GET", "/trash/", {
    cookie: ownerCookie,
  });

  status(restoredTrash, 200, "List trash after restore");

  assert.ok(
    !JSON.stringify(restoredTrash.data).includes(fileId),
    "Restored file is still in trash",
  );

  console.log(
    "PASS: Restore, integrity, and applicable directory-size consistency",
  );
});
