import test from "node:test";
import assert from "node:assert/strict";

import { escapeRegExp as original } from "../../utils/escapeRegExp.js";
import { escapeRegExp as migrated } from "../../utils/escapeRegExp.ts";

test("TypeScript preserves original behavior", () => {
  const inputs = [
    "",
    "hello",
    "Vault Storage",
    "file.txt",
    "a+b*c?",
    "report[1].pdf",
    "(test)|example",
    "^start$",
    "folder\\file",
    "नमस्ते📁",
    null,
    undefined,
    123,
    true,
    false,
    [],
    {},
    new String("hello"),
  ];

  for (const input of inputs) {
    assert.equal(
      migrated(input),
      original(input),
      `Mismatch for ${String(input)}`,
    );
  }
});

test("TypeScript returns expected escaped patterns", () => {
  assert.equal(migrated("hello"), "hello");
  assert.equal(migrated("file.txt"), String.raw`file\.txt`);
  assert.equal(migrated("a+b"), String.raw`a\+b`);
  assert.equal(migrated(null), "");
  assert.equal(migrated(123), "");
});

test("TypeScript output matches literal filenames", () => {
  const filename = "report[1].pdf";
  const pattern = new RegExp(`^${migrated(filename)}$`);

  assert.equal(pattern.test(filename), true);
  assert.equal(pattern.test("report1.pdf"), false);
});
