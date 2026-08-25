import { processThumbnailDirectly } from "../workers/thumbnailWorker.js";

/**
 * Dispatches CPU-optimized thumbnail generation in-memory with zero disk I/O.
 * Sharp runs asynchronously in libuv's C++ thread pool without blocking the main event loop.
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
export async function processThumbnailInWorker({
  type,
  buffer = null,
  videoUrl = null,
  width = 256,
  height = 144,
  quality = 75,
  timeoutMs = 15000,
}) {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`Thumbnail generation timed out after ${timeoutMs}ms`)),
      timeoutMs
    );
  });

  try {
    const result = await Promise.race([
      processThumbnailDirectly({
        type,
        buffer,
        videoUrl,
        width,
        height,
        quality,
      }),
      timeoutPromise,
    ]);
    return result;
  } finally {
    clearTimeout(timerId);
  }
}
