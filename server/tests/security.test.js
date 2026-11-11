import test from "node:test";
import assert from "node:assert/strict";
import { originGuard, safeUser } from "../security.js";

function responseRecorder() {
  return {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

test("origin guard accepts the configured same-origin POST", () => {
  const previous = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://questpulse.example";
  const req = { method: "POST", get: name => name === "origin" ? "https://questpulse.example" : undefined };
  const res = responseRecorder();
  let continued = false;
  originGuard(req, res, () => { continued = true; });
  assert.equal(continued, true);
  assert.equal(res.statusCode, 200);
  if (previous === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = previous;
});

test("origin guard rejects missing and mismatched origins for writes", () => {
  const previous = process.env.APP_ORIGIN;
  process.env.APP_ORIGIN = "https://questpulse.example";
  for (const origin of [undefined, "https://attacker.example"]) {
    const req = { method: "POST", get: name => name === "origin" ? origin : undefined };
    const res = responseRecorder();
    let continued = false;
    originGuard(req, res, () => { continued = true; });
    assert.equal(continued, false);
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.payload, { error: "Request origin rejected." });
  }
  if (previous === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = previous;
});

test("origin guard keeps safe read methods available without an origin", () => {
  const previous = process.env.APP_ORIGIN;
  delete process.env.APP_ORIGIN;
  const req = { method: "GET", get: () => undefined };
  const res = responseRecorder();
  let continued = false;
  originGuard(req, res, () => { continued = true; });
  assert.equal(continued, true);
  if (previous !== undefined) process.env.APP_ORIGIN = previous;
});

test("public user projection never exposes password or internal fields", () => {
  const user = safeUser({
    id: "user-1",
    display_name: "Example",
    account_type: "individual",
    email: "example@example.com",
    role: "publisher",
    status: "active",
    password_hash: "must-not-leak",
    reset_token: "must-not-leak"
  });
  assert.deepEqual(user, {
    id: "user-1",
    displayName: "Example",
    accountType: "individual",
    email: "example@example.com",
    role: "publisher",
    status: "active"
  });
  assert.equal(JSON.stringify(user).includes("must-not-leak"), false);
});
