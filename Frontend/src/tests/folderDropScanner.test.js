import assert from "node:assert/strict";
import { readAllDirectoryEntries, scanDroppedItems } from "../lib/folderDropScanner.js";

async function runFolderDropScannerTests() {
  console.log("\n🧪 --- RUNNING FOLDER DROP SCANNER TESTS --- 🧪\n");

  // 1. Test readAllDirectoryEntries drains batches
  let batchCall = 0;
  const mockReader = {
    readEntries: (successCallback) => {
      batchCall++;
      if (batchCall === 1) {
        // First batch: 100 items
        const batch1 = Array.from({ length: 100 }, (_, i) => ({
          name: `file_${i}.mp4`,
          isFile: true,
          isDirectory: false,
        }));
        successCallback(batch1);
      } else if (batchCall === 2) {
        // Second batch: 25 items
        const batch2 = Array.from({ length: 25 }, (_, i) => ({
          name: `file_${100 + i}.mp4`,
          isFile: true,
          isDirectory: false,
        }));
        successCallback(batch2);
      } else {
        // Empty batch signaling end
        successCallback([]);
      }
    },
  };

  const drainedEntries = await readAllDirectoryEntries(mockReader);
  assert.equal(drainedEntries.length, 125, "Must drain all 125 entries across batches");
  assert.equal(batchCall, 3, "Must call readEntries 3 times until empty");
  console.log("  ✅ PASS: readAllDirectoryEntries drains batches of >100 entries completely");

  // 2. Test fallback when no directories are present
  const mockFiles = [{ name: "clip.mp4", size: 1024 }];
  const nonFolderResult = await scanDroppedItems(null, mockFiles);
  assert.equal(nonFolderResult.isFolderDrop, false);
  assert.equal(nonFolderResult.files.length, 1);
  assert.equal(nonFolderResult.files[0].name, "clip.mp4");
  console.log("  ✅ PASS: scanDroppedItems falls back cleanly when no items/directories present");

  console.log("\nAll Folder Drop Scanner unit tests passed!\n");
}

runFolderDropScannerTests().catch((err) => {
  console.error("  ❌ FAIL:", err);
  process.exit(1);
});
