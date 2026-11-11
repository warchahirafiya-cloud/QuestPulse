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

function withOrigin(value, callback) {
  const previous = process.env.APP_ORIGIN;
  if (value === undefined) delete process.env.APP_ORIGIN;
  else process.env.APP_ORIGIN = value;
  try { callback(); }
  finally {
    if (previous === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previous;
  }
}

test("origin guard accepts an exact configured same-origin POST", () => {
  withOrigin("https://questpulse.example", () => {
    const req = { method: "POST", get: name => name === "origin" ? "https://questpulse.example" : undefined };
    const res = responseRecorder();
    let continued = false;
    originGuard(req, res, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(res.statusCode, 200);
  });
});

test("origin guard rejects missing configuration, missing origin, and foreign origins on writes", () => {
  for (const [expected, origin] of [
    [undefined, "https://questpulse.example"],
    ["https://questpulse.example", undefined],
    ["https://questpulse.example", "https://attacker.example"]
  ]) {
    withOrigin(expected, () => {
      const req = { method: "POST", get: name => name === "origin" ? origin : undefined };
      const res = responseRecorder();
      let continued = false;
      originGuard(req, res, () => { continued = true; });
      assert.equal(continued, false);
      assert.equal(res.statusCode, 403);
      assert.deepEqual(res.payload, { error: "Request origin rejected." });
    });
  }
});

test("origin guard allows safe read methods without an origin", () => {
  withOrigin(undefined, () => {
    for (const method of ["GET", "HEAD", "OPTIONS"]) {
      const req = { method, get: () => undefined };
      const res = responseRecorder();
      let continued = false;
      originGuard(req, res, () => { continued = true; });
      assert.equal(continued, true, method);
    }
  });
});

test("public user projection excludes password hashes and internal fields", () => {
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
