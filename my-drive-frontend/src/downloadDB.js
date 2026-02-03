const DB_NAME = "download-manager";
const DB_VERSION = 1;
const STORE = "chunks";

export function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, {
          keyPath: "key",
        });
        store.createIndex("fileId", "fileId", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveChunk(fileId, offset, chunk) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);

    // Using put request error handling too
    const req = store.put({
      key: `${fileId}-${offset}`,
      fileId,
      offset,
      chunk,
    });

    req.onerror = () => reject(req.error);

    // Transaction completion is the safest point
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getChunks(fileId) {
  const db = await openDB();
  const tx = db.transaction(STORE, "readonly");
  const index = tx.objectStore(STORE).index("fileId");

  return new Promise((resolve, reject) => {
    const chunks = [];
    // Using cursor
    const req = index.openCursor(IDBKeyRange.only(fileId));

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        chunks.push(cursor.value);
        cursor.continue();
      } else {
        chunks.sort((a, b) => a.offset - b.offset);
        resolve(chunks.map((c) => c.chunk));
      }
    };

    req.onerror = () => reject(req.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearFile(fileId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const index = tx.objectStore(STORE).index("fileId");

    // We need to delete via cursor or key range delete if index supports it,
    // but standard index delete isn't always direct.
    // Best way for "delete all by index" is openKeyCursor + delete
    // OR just iterate cursor and delete.

    const req = index.openCursor(IDBKeyRange.only(fileId));

    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
