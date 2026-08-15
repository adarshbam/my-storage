import { Worker } from "node:worker_threads";
import path from "node:path";
import os from "node:os";

const WORKER_SCRIPT = path.join(import.meta.dirname, "../workers/thumbnailWorker.js");
const MAX_CONCURRENT_WORKERS = Math.min(Math.max(os.cpus().length - 1, 2), 4);

let activeWorkersCount = 0;
const queue = [];

function processNext() {
  if (queue.length === 0 || activeWorkersCount >= MAX_CONCURRENT_WORKERS) {
    return;
  }

  const { task, resolve, reject, timeoutMs } = queue.shift();
  activeWorkersCount++;

  let isSettled = false;
  const worker = new Worker(WORKER_SCRIPT);

  const timeoutId = setTimeout(() => {
    if (!isSettled) {
      isSettled = true;
      worker.terminate().catch(() => {});
      activeWorkersCount--;
      reject(new Error(`Thumbnail generation worker timed out after ${timeoutMs}ms`));
      processNext();
    }
  }, timeoutMs);

  worker.on("message", (msg) => {
    if (isSettled) return;
    isSettled = true;
    clearTimeout(timeoutId);
    worker.terminate().catch(() => {});
    activeWorkersCount--;

    if (msg.success) {
      resolve(msg);
    } else {
      reject(new Error(msg.error || "Worker thumbnail generation failed"));
    }
    processNext();
  });

  worker.on("error", (err) => {
    if (isSettled) return;
    isSettled = true;
    clearTimeout(timeoutId);
    worker.terminate().catch(() => {});
    activeWorkersCount--;
    reject(err);
    processNext();
  });

  worker.on("exit", (code) => {
    if (!isSettled) {
      isSettled = true;
      clearTimeout(timeoutId);
      activeWorkersCount--;
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
      processNext();
    }
  });

  worker.postMessage(task);
}

/**
 * Dispatches a CPU-heavy thumbnail task to a multithreaded Worker Thread.
 *
 * @param {Object} options
 * @param {'image'|'video'} options.type
 * @param {Buffer} [options.buffer]
 * @param {string} [options.videoUrl]
 * @param {number} [options.width=256]
 * @param {number} [options.height=144]
 * @param {number} [options.quality=75] - Tunable WebP compression quality (1-100)
 * @param {number} [options.timeoutMs=15000]
 * @returns {Promise<{ data: Buffer, contentType: string, size: number }>}
 */
export function processThumbnailInWorker({
  type,
  buffer = null,
  videoUrl = null,
  width = 256,
  height = 144,
  quality = 75,
  timeoutMs = 15000,
}) {
  return new Promise((resolve, reject) => {
    const task = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      buffer,
      videoUrl,
      width,
      height,
      quality,
    };

    queue.push({ task, resolve, reject, timeoutMs });
    processNext();
  });
}
