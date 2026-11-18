import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  HeadBucketCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

test("Vault's actual S3 client works with Moto", async () => {
  // Set test mode BEFORE importing Vault's configuration.
  process.env.NODE_ENV = "test";

  const { s3Client } = await import("../../integrations/storage/s3.client.js");

  // Verify that configuration loading selected the local emulator.
  assert.equal(process.env.BACKBLAZE_ENDPOINT, "http://127.0.0.1:5001");

  assert.equal(process.env.BACKBLAZE_BUCKET_NAME, "vault-test-local");

  const bucket = process.env.BACKBLAZE_BUCKET_NAME;
  const key = `smoke/${randomUUID()}.txt`;
  const original = Buffer.from("Vault shared S3 client test");

  let uploaded = false;

  try {
    // Ensure the test bucket exists.
    let bucketExists = true;

    try {
      await s3Client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      if (error.$metadata?.httpStatusCode === 404) {
        bucketExists = false;
      } else {
        throw error;
      }
    }

    if (!bucketExists) {
      await s3Client.send(new CreateBucketCommand({ Bucket: bucket }));
    }

    // Upload using Vault's real shared client.
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: original,
        ContentType: "text/plain",
      }),
    );

    uploaded = true;

    // Download using the same shared client.
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const downloaded = Buffer.from(await result.Body.transformToByteArray());

    assert.deepEqual(downloaded, original);
  } finally {
    if (uploaded) {
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }),
      );
    }

    s3Client.destroy();
  }
});
