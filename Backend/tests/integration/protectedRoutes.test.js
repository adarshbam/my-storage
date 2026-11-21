import { test } from "node:test";
import assert from "node:assert/strict";

if (process.env.NODE_ENV !== "test") {
  throw new Error("Protected-route tests require NODE_ENV=test");
}

// Validate isolated test configuration.
await import("../../config/config.js");

const BASE_URL = "http://127.0.0.1:4100";

const protectedRoutes = [
  { method: "GET", path: "/user/" },
  { method: "GET", path: "/user/searchedItems" },
  { method: "POST", path: "/user/logout-all" },
  { method: "PATCH", path: "/user/name" },
];

async function expectUnauthorized(method, path, cookie) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: cookie ? { Cookie: cookie } : {},
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });

  const body = await response.text();

  assert.ok(
    [401, 403, 404].includes(response.status),
    `${method} ${path} returned ${response.status}: ${body}`,
  );

  // 404 is acceptable only when the application
  // explicitly reports a missing/invalid session.
  if (response.status === 404) {
    assert.match(
      body,
      /sess+ion|not logged in|unauthoriz|authentication/i,
      `Unexpected 404 response: ${body}`,
    );
  }

  console.log(`PASS: ${method} ${path} rejected (${response.status})`);
}

test("Protected routes reject unauthenticated requests", async (t) => {
  for (const route of protectedRoutes) {
    await t.test(`${route.method} ${route.path}`, async () => {
      await expectUnauthorized(route.method, route.path);
    });
  }

  await t.test("Reject forged session cookie", async () => {
    await expectUnauthorized("GET", "/user/", "sessionId=s%3Ainvalid.invalid");
  });
});
