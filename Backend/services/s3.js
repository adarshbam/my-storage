import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  endpoint: process.env.BACKBLAZE_ENDPOINT,
  region: process.env.BACKBLAZE_REGION,
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.BACKBLAZE_ACCESS_KEY_ID,
    secretAccessKey: process.env.BACKBLAZE_SECRET_ACCESS_KEY,
  },
});

export const createUploadSignedUrl = async ({ key, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return url;
};

export const createDownloadSignedUrl = async ({ key }) => {
  const command = new GetObjectCommand({
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: 3600,
  });

  return url;
};

export const uploadToB2 = async ({ key, body, contentType }) => {
  const command = new PutObjectCommand({
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType || "application/octet-stream",
  });
  return await s3Client.send(command);
};

export const getObjectFromB2 = async ({ key, range }) => {
  const params = {
    Bucket: process.env.BACKBLAZE_BUCKET_NAME,
    Key: key,
  };
  if (range) {
    params.Range = range;
  }
  const command = new GetObjectCommand(params);
  return await s3Client.send(command);
};

export const deleteFromB2 = async ({ key }) => {
  if (!key) return;
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Key: key,
    });
    return await s3Client.send(command);
  } catch (err) {
    if (err.name !== "NoSuchKey" && err.name !== "NotFound") {
      console.error(`Failed to delete B2 key ${key}:`, err);
    }
  }
};

export const deleteMultipleFromB2 = async ({ keys }) => {
  if (!keys || keys.length === 0) return;
  try {
    const validKeys = keys.filter(Boolean).map((k) => ({ Key: k }));
    if (validKeys.length === 0) return;
    const command = new DeleteObjectsCommand({
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      Delete: { Objects: validKeys, Quiet: true },
    });
    return await s3Client.send(command);
  } catch (err) {
    console.error("Failed batch delete from B2:", err);
  }
};

export const copyInB2 = async ({ sourceKey, destinationKey }) => {
  try {
    const command = new CopyObjectCommand({
      Bucket: process.env.BACKBLAZE_BUCKET_NAME,
      CopySource: `/${process.env.BACKBLAZE_BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey,
    });
    return await s3Client.send(command);
  } catch (err) {
    console.error(`Failed to copy in B2 from ${sourceKey} to ${destinationKey}:`, err);
    throw err;
  }
};

