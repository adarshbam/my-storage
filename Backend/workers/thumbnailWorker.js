import { parentPort } from "node:worker_threads";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { PassThrough, Readable } from "node:stream";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Thumbnail Worker Thread
 * Runs CPU-heavy Sharp / FFmpeg transformations on an isolated OS thread.
 * Zero disk I/O: Streams frames and buffers purely in RAM and returns WebP buffers.
 */
parentPort.on("message", async (task) => {
  const {
    id,
    type, // 'image' | 'video'
    buffer, // Buffer or null
    videoUrl, // Signed URL or stream source if buffer not provided
    width = 256,
    height = 144, // 16:9 ratio for crisp preview
    quality = 75, // WebP compression quality (1-100)
  } = task;

  try {
    let resultBuffer;

    if (type === "image") {
      if (!buffer) {
        throw new Error("No image buffer provided for thumbnail generation");
      }

      resultBuffer = await sharp(buffer, { failOnError: false })
        .resize(width, height, {
          fit: "cover",
          position: "centre",
          withoutEnlargement: false,
        })
        .webp({
          quality,
          effort: 4, // Balanced CPU effort for high speed + optimal compression
          smartSubsample: true,
        })
        .toBuffer();
    } else if (type === "video") {
      let inputStream;

      if (buffer) {
        inputStream = Readable.from(buffer);
      }

      const passThrough = new PassThrough();
      const chunks = [];

      passThrough.on("data", (chunk) => chunks.push(chunk));

      await new Promise((resolve, reject) => {
        const command = ffmpeg(inputStream || videoUrl)
          .seekInput(1) // Capture frame at 1 second
          .outputOptions([
            "-vframes 1",
            "-f image2pipe",
            "-vcodec mjpeg",
            "-pix_fmt yuvj420p",
          ]);

        command.on("error", (err) => {
          // If seeking to 1s fails on short video, try at 0s
          const retryCommand = ffmpeg(inputStream || videoUrl)
            .outputOptions(["-vframes 1", "-f image2pipe", "-vcodec mjpeg"])
            .pipe(passThrough);

          retryCommand.on("error", reject);
        });

        command.pipe(passThrough);
        passThrough.on("end", resolve);
        passThrough.on("error", reject);
      });

      const frameBuffer = Buffer.concat(chunks);
      if (!frameBuffer || frameBuffer.length === 0) {
        throw new Error("FFmpeg produced empty frame buffer");
      }

      resultBuffer = await sharp(frameBuffer, { failOnError: false })
        .resize(width, height, {
          fit: "cover",
          position: "centre",
        })
        .webp({
          quality,
          effort: 4,
          smartSubsample: true,
        })
        .toBuffer();
    } else {
      throw new Error(`Unsupported media type for thumbnail: ${type}`);
    }

    parentPort.postMessage({
      id,
      success: true,
      data: resultBuffer,
      contentType: "image/webp",
      size: resultBuffer.length,
    });
  } catch (err) {
    parentPort.postMessage({
      id,
      success: false,
      error: err.message || "Thumbnail processing failed",
    });
  }
});
