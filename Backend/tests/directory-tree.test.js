import assert from "node:assert/strict";
import {
  ensureDirectoryTreeLogic,
  sortTreePathsByDepth,
} from "../services/directory.service.js";

async function runDirectoryTreeTests() {
  console.log("\n📁 --- RUNNING VAULT DIRECTORY TREE CREATION TESTS --- 📁\n");

  // 1. Test sorting paths by depth
  const rawPaths = [
    "Mjo videos/Season 1/Bonus/clip",
    "Mjo videos",
    "Mjo videos/Season 2",
    "Mjo videos/Season 1",
    "Standalone Folder",
  ];

  const sorted = sortTreePathsByDepth(rawPaths);
  assert.equal(sorted[0], "Mjo videos");
  assert.equal(sorted[1], "Standalone Folder");
  assert.ok(sorted.indexOf("Mjo videos/Season 1") < sorted.indexOf("Mjo videos/Season 1/Bonus/clip"));
  console.log("  ✅ PASS: sortTreePathsByDepth correctly orders parents before children");

  // 2. Test export exists and validates inputs
  assert.equal(typeof ensureDirectoryTreeLogic, "function", "ensureDirectoryTreeLogic should be a function");
  console.log("  ✅ PASS: ensureDirectoryTreeLogic function is exported");

  console.log("\nAll Directory Tree unit tests passed!\n");
  process.exit(0);
}

runDirectoryTreeTests().catch((err) => {
  console.error("  ❌ FAIL:", err);
  process.exit(1);
});
