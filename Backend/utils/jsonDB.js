import { writeFile, rename, readFile } from "fs/promises";
import { resolve } from "path";

class Mutex {
  constructor() {
    this._queue = Promise.resolve();
  }

  lock(callback) {
    const next = this._queue.then(() => callback());
    this._queue = next.catch(() => {}); // Prevent errors from blocking the queue
    return next;
  }
}

const dbMutex = new Mutex();

export const readJSON = async (path) => {
  return dbMutex.lock(async () => {
    const data = await readFile(path, "utf-8");
    return JSON.parse(data);
  });
};

export const writeJSON = async (path, data) => {
  return dbMutex.lock(async () => {
    const absolutePath = resolve(path);
    const tempPath = `${absolutePath}.tmp`;

    try {
      await writeFile(tempPath, JSON.stringify(data));
      await rename(tempPath, absolutePath);
    } catch (err) {
      console.error(`Failed to write JSON DB to ${path}`, err);
      throw err;
    }
  });
};
