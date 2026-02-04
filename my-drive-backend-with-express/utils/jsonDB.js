import { writeFile, rename } from "node:fs/promises";
import path from "node:path";

/**
 * Atomically writes data to a JSON file.
 * 1. Writes data to a temporary file.
 * 2. Renames the temporary file to the target file.
 * This prevents file corruption if the process crashes during write.
 *
 * @param {string} filePath - Absolute or relative path to the JSON file.
 * @param {any} data - The data to serialize and write.
 */
export const writeJSON = async (filePath, data) => {
  const tempPath = `${filePath}.tmp`;
  try {
    const jsonString = JSON.stringify(data); // Minified JSON to save space, or use null, 2 for readable
    await writeFile(tempPath, jsonString);
    await rename(tempPath, filePath);
  } catch (error) {
    console.error(`Failed to write JSON to ${filePath}`, error);
    throw error;
  }
};
