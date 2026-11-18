import test from "node:test";
import assert from "node:assert/strict";
import { escapeRegExp } from "../../utils/escapeRegExp.js";

test("preserves ordinary strings", () => {
  assert.equal(escapeRegExp("hello"), "hello");
  assert.equal(escapeRegExp("my file"), "my file");
  assert.equal(escapeRegExp(""), "");
  assert.equal(escapeRegExp("Vault_2026"), "Vault_2026");
});

test("escapes special regex characters", () => {
  const cases = [
    [".", "\\."],
    ["*", "\\*"],
    ["+", "\\+"],
    ["?", "\\?"],
    ["^", "\\^"],
    ["$", "\\$"],
    ["{", "\\{"],
    ["}", "\\}"],
    ["(", "\\("],
    [")", "\\)"],
    ["|", "\\|"],
    ["[", "\\["],
    ["]", "\\]"],
    ["\\", "\\\\"],
  ];

  for (const [input, expected] of cases) {
    assert.equal(
      escapeRegExp(input),
      expected,
      `Incorrect escaping for ${JSON.stringify(input)}`,
    );
  }
});

test("escapes complex filenames", () => {
  const input = "file[1].(final)+?.txt";
  const expected = String.raw`file\[1\]\.\(final\)\+\?\.txt`;

  assert.equal(escapeRegExp(input), expected);
});

test("preserves Unicode and ordinary punctuation", () => {
  assert.equal(escapeRegExp("नमस्ते📁"), "नमस्ते📁");
  assert.equal(escapeRegExp("a-b_c / file"), "a-b_c / file");
});

test("preserves existing non-string fallback", () => {
  const inputs = [
    null,
    undefined,
    123,
    0,
    true,
    false,
    [],
    {},
    new String("hello"),
  ];

  for (const input of inputs) {
    assert.equal(
      escapeRegExp(input),
      "",
      `Expected empty string for ${String(input)}`,
    );
  }
});

test("produces a regex that matches literal filenames", () => {
  const filename = "report[1].pdf";
  const pattern = new RegExp(`^${escapeRegExp(filename)}$`);

  assert.equal(pattern.test(filename), true);
  assert.equal(pattern.test("report11xpdf"), false);
  assert.equal(pattern.test("report1.pdf"), false);
});
