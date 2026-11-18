import assert from "node:assert/strict";
import { PassThrough, Readable } from "node:stream";
import {
  streamItemsAsZip,
  downloadItemsBatchLogic,
} from "../../services/directory.service.js";

function createMockResponse() {
  const res = new PassThrough();
  const headers = {};
  const chunks = [];
  let destroyedWith = null;

  res.headersSent = false;

  res.setHeader = (key, value) => {
    headers[key.toLowerCase()] = value;
  };
  res.getHeader = (key) => headers[key.toLowerCase()];
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.jsonBody = body;
    return res;
  };

  const origWrite = res.write.bind(res);
  res.write = (chunk, ...args) => {
    res.headersSent = true;
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    return origWrite(chunk, ...args);
  };

  const origEnd = res.end.bind(res);
  res.end = (chunk, ...args) => {
    if (chunk) {
      res.headersSent = true;
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return origEnd(chunk, ...args);
  };

  const origDestroy = res.destroy.bind(res);
  res.destroy = (err) => {
    destroyedWith = err || new Error("Destroyed");
    return origDestroy(err);
  };

  return {
    res,
    headers,
    getBuffer: () => Buffer.concat(chunks),
    getDestroyedError: () => destroyedWith,
  };
}

function parseZipEntryNames(zipBuffer) {
  const names = [];
  let offset = 0;
  while (offset + 46 <= zipBuffer.length) {
    const sig = zipBuffer.readUInt32LE(offset);
    if (sig === 0x02014b50) {
      const nameLen = zipBuffer.readUInt16LE(offset + 28);
      const extraLen = zipBuffer.readUInt16LE(offset + 30);
      const commentLen = zipBuffer.readUInt16LE(offset + 32);
      const nameStart = offset + 46;
      names.push(zipBuffer.slice(nameStart, nameStart + nameLen).toString("utf8"));
      offset = nameStart + nameLen + extraLen + commentLen;
    } else {
      offset += 1;
    }
  }
  return names;
}

function makeQuery(rows) {
  return {
    select() {
      return this;
    },
    lean: async () => rows,
  };
}

async function testStreamItemsAsZipRecursiveAndFiltersUploading() {
  const filesByParent = {
    dirRoot: [
      { _id: "f1", name: "intro.mp4", extension: ".mp4", size: 11, uploadStatus: "completed" },
      { _id: "f2", name: "pending.mov", extension: "mov", size: 99, uploadStatus: "uploading" },
    ],
    dirSub: [
      { _id: "f3", name: "notes.txt", extension: ".txt", size: 12, uploadStatus: "completed" },
    ],
    dirEmpty: [],
  };
  const dirsByParent = {
    dirRoot: [
      { _id: "dirSub", name: "Sub Folder" },
      { _id: "dirEmpty", name: "Empty Sub" },
    ],
    dirSub: [],
    dirEmpty: [],
  };

  const mockFileModel = {
    find(query) {
      const rows = (filesByParent[query.parentDir] || []).filter((f) => {
        if (query.uploadStatus?.$ne === "uploading") {
          return f.uploadStatus !== "uploading";
        }
        return true;
      });
      return makeQuery(rows);
    },
  };
  const mockDirModel = {
    find(query) {
      return makeQuery(dirsByParent[query.parentDir] || []);
    },
  };

  const requestedKeys = [];
  const mockGetObjectFromB2 = async ({ key }) => {
    requestedKeys.push(key);
    const payload = key === "f1.mp4" ? "video-bytes" : "hello-world!";
    return { Body: Readable.from([Buffer.from(payload)]) };
  };

  const { res, headers, getBuffer } = createMockResponse();

  await streamItemsAsZip({
    rootName: "Introduction Recording ",
    directories: [{ _id: "dirRoot", name: "Introduction Recording " }],
    res,
    deps: {
      File: mockFileModel,
      Directory: mockDirModel,
      getObjectFromB2: mockGetObjectFromB2,
    },
  });

  const zipBuf = getBuffer();
  assert.ok(zipBuf.length > 50, "ZIP buffer should be non-empty");
  assert.equal(zipBuf.readUInt32LE(0), 0x04034b50, "Output must start with ZIP local file header");

  const entryNames = parseZipEntryNames(zipBuf);
  assert.ok(entryNames.includes("Introduction Recording/intro.mp4"), "Root file uses trimmed POSIX path without trailing space");
  assert.ok(
    entryNames.includes("Introduction Recording/Sub Folder/notes.txt"),
    "Nested subfolder file is included with POSIX path",
  );
  assert.ok(
    entryNames.includes("Introduction Recording/Empty Sub/"),
    "Empty subfolder entry is preserved",
  );
  assert.ok(
    !entryNames.some((n) => n.includes("pending.mov")),
    "Files with uploadStatus='uploading' must be excluded",
  );
  assert.ok(
    entryNames.every((n) => !n.includes("\\")),
    "ZIP entry paths must never contain Windows backslashes",
  );
  assert.deepEqual(requestedKeys, ["f1.mp4", "f3.txt"]);
  assert.equal(headers["x-total-files"], 2);
  assert.equal(headers["x-total-size"], 23);
  assert.equal(headers["cache-control"], "no-transform");
  assert.match(headers["content-disposition"], /Introduction Recording\.zip/);
  console.log("  PASS: streamItemsAsZip streams B2 entries recursively with sanitized POSIX paths and excludes uploading files");
}

async function testStreamErrorPropagation() {
  const mockFileModel = {
    find() {
      return makeQuery([]);
    },
  };
  const mockDirModel = {
    find() {
      return makeQuery([]);
    },
  };
  const mockGetObjectFromB2 = async ({ key }) => {
    if (key.startsWith("f2")) {
      const err = new Error("NoSuchKey");
      err.name = "NoSuchKey";
      throw err;
    }
    return { Body: Readable.from([Buffer.from("first-file-content")]) };
  };

  const { res, getDestroyedError } = createMockResponse();
  res.on("error", () => {});

  await streamItemsAsZip({
    rootName: "Broken Folder",
    files: [
      { _id: "f1", name: "ok.mp4", extension: ".mp4", size: 18 },
      { _id: "f2", name: "missing.mp4", extension: ".mp4", size: 10 },
    ],
    res,
    deps: {
      File: mockFileModel,
      Directory: mockDirModel,
      getObjectFromB2: mockGetObjectFromB2,
    },
  });

  assert.ok(getDestroyedError(), "Response must be destroyed when B2 fails mid-stream");
  assert.equal(res.writableEnded, false, "Broken archive must not end cleanly as completed");
  console.log("  PASS: streamItemsAsZip destroys response on mid-stream B2 error");
}

async function testDownloadItemsBatchMixedAndAuth() {
  const sampleFiles = [
    { _id: "file1", name: "readme.md", extension: "md", size: 8, userId: "owner1", path: [] },
  ];
  const sampleDirs = [
    { _id: "dir1", name: "Recordings", userId: "owner1", path: [] },
  ];
  const childFiles = [
    { _id: "file2", name: "clip.mp4", extension: ".mp4", size: 9, uploadStatus: "completed" },
  ];

  const mockFileModel = {
    find(query) {
      if (query._id?.$in) {
        return makeQuery(sampleFiles.filter((f) => query._id.$in.includes(f._id)));
      }
      if (query.parentDir === "dir1") {
        return makeQuery(childFiles);
      }
      return makeQuery([]);
    },
  };
  const mockDirModel = {
    find(query) {
      if (query._id?.$in) {
        return makeQuery(sampleDirs.filter((d) => query._id.$in.includes(d._id)));
      }
      return makeQuery([]);
    },
  };

  // 1. Authorization failure -> 403
  const unauthorizedRes = createMockResponse();
  await assert.rejects(
    () =>
      downloadItemsBatchLogic({
        items: [
          { _id: "file1", type: "file" },
          { _id: "dir1", type: "directory" },
        ],
        userId: "otherUser",
        userRole: "User",
        res: unauthorizedRes.res,
        deps: {
          File: mockFileModel,
          Directory: mockDirModel,
          verifyItemAccess: async () => false,
        },
      }),
    (err) => err.status === 403,
  );
  console.log("  PASS: downloadItemsBatchLogic enforces 403 when verifyItemAccess denies access");

  // 2. Authorized mixed batch -> vault-selection.zip with file + folder contents
  const okRes = createMockResponse();
  await downloadItemsBatchLogic({
    items: [
      { _id: "file1", type: "file" },
      { _id: "dir1", type: "directory" },
    ],
    userId: "owner1",
    userRole: "User",
    res: okRes.res,
    deps: {
      File: mockFileModel,
      Directory: mockDirModel,
      verifyItemAccess: async () => true,
      getObjectFromB2: async ({ key }) => ({
        Body: Readable.from([Buffer.from(key === "file1.md" ? "# readme" : "mp4-bytes")]),
      }),
    },
  });

  const entryNames = parseZipEntryNames(okRes.getBuffer());
  assert.ok(entryNames.includes("readme.md"), "Top-level selected file included in batch zip");
  assert.ok(entryNames.includes("Recordings/clip.mp4"), "Selected folder contents included in batch zip");
  assert.match(okRes.headers["content-disposition"], /vault-selection\.zip/);
  assert.equal(okRes.headers["x-total-files"], 2);
  console.log("  PASS: downloadItemsBatchLogic bundles mixed selected files and folders into vault-selection.zip");
}

async function run() {
  console.log("\n--- Running Directory & Batch Download Unit Tests ---\n");
  await testStreamItemsAsZipRecursiveAndFiltersUploading();
  await testStreamErrorPropagation();
  await testDownloadItemsBatchMixedAndAuth();
  console.log("\nAll Directory & Batch Download unit tests passed!\n");
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAIL:", err);
    process.exit(1);
  });
