import test from "node:test";
import assert from "node:assert/strict";

import { escapeRegExp } from "../../utils/escapeRegExp.ts";

test("Node.js can import the TypeScript helper", () => {
  assert.equal(escapeRegExp("file.txt"), String.raw`file\.txt`);

  assert.equal(escapeRegExp("report[1].pdf"), String.raw`report\[1\]\.pdf`);

  assert.equal(escapeRegExp(null), "");
});
