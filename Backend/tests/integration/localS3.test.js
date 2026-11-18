import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  S3Client,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteBucketCommand,
} from "@aws-sdk/client-s3";

test("local S3 supports upload and download", async () => {
  const client = new S3Client({
    endpoint: "http://127.0.0.1:5001",
    region: "us-east-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: "test",
      secretAccessKey: "test",
    },
  });

  const bucket = `vault-test-${randomUUID()}`;
  const key = "smoke/fixture.txt";
  const original = Buffer.from("Vault isolated storage test");

  let bucketCreated = false;
  let objectCreated = false;

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    bucketCreated = true;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: original,
        ContentType: "text/plain",
      }),
    );
    objectCreated = true;

    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    const downloaded = Buffer.from(await response.Body.transformToByteArray());

    assert.deepEqual(downloaded, original);
  } finally {
    try {
      if (objectCreated) {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: key,
          }),
        );
      }

      if (bucketCreated) {
        await client.send(
          new DeleteBucketCommand({
            Bucket: bucket,
          }),
        );
      }
    } finally {
      client.destroy();
    }
  }
});
