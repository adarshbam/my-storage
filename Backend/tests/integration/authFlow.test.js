import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

// Safety: never run this test under a production environment.
if (process.env.NODE_ENV !== "test") {
  throw new Error("Authentication tests require NODE_ENV=test");
}

// Load and validate our isolated test configuration.
await import("../../config/config.js");

const BASE_URL = "http://127.0.0.1:4100";

async function request(method, path, { body, cookie } = {}) {
  const headers = {};

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (cookie) {
    headers.Cookie = cookie;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });

  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { response, data };
}

function extractCookies(response) {
  return response.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
}

test("Register → Login → Protected route → Logout", async () => {
  const account = {
    name: "Vault Integration Test",
    email: `vault-test-${randomUUID()}@example.invalid`,
    password: "Vault!Test2026#Strong",
  };

  // 1. Registration
  const registration = await request("POST", "/user/register", {
    body: account,
  });

  assert.equal(
    registration.response.status,
    201,
    `Registration failed: ${JSON.stringify(registration.data)}`,
  );

  console.log("PASS: Registration");

  // 2. Login
  const login = await request("POST", "/user/login", {
    body: {
      email: account.email,
      password: account.password,
    },
  });

  assert.equal(
    login.response.status,
    200,
    `Login failed: ${JSON.stringify(login.data)}`,
  );

  const sessionCookie = extractCookies(login.response);

  assert.match(sessionCookie, /(?:^|;\s*)sessionId=/);

  console.log("PASS: Login");

  // 3. Protected route
  const profile = await request("GET", "/user/", {
    cookie: sessionCookie,
  });

  assert.equal(profile.response.status, 200);

  console.log("PASS: Protected route");

  // 4. Logout
  const logout = await request("POST", "/user/logout", {
    cookie: sessionCookie,
  });

  assert.equal(logout.response.status, 200);

  console.log("PASS: Logout");

  // 5. Reuse old session
  const rejected = await request("GET", "/user/", {
    cookie: sessionCookie,
  });

  assert.ok(
    [401, 403, 404].includes(rejected.response.status),
    `Old session was not rejected: ${rejected.response.status}`,
  );

  if (rejected.response.status === 404) {
    assert.match(
      JSON.stringify(rejected.data),
      /sess+ion\s+not\s+found|not logged in|unauthoriz|invalid|expired/i,
    );
  }

  console.log("PASS: Old session rejected");
});
