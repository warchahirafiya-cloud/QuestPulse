import test from "node:test";
import assert from "node:assert/strict";
import { handleRequest } from "../src/index.js";

function makeEnv(rows = []) {
  return {
    DB: {
      prepare(sql) {
        return {
          bind(...values) {
            return {
              async first() {
                const row = rows.find(item => item.id === values[0]);
                return row ? { payload: JSON.stringify(row) } : null;
              },
              async all() {
                return { results: rows.map(row => ({ payload: JSON.stringify(row) })) };
              }
            };
          }
        };
      }
    },
    ALLOWED_ORIGIN: "https://getquestpulse.com"
  };
}

test("health endpoint reports read-only service", async () => {
  const response = await handleRequest(new Request("https://api.test/api/health"), makeEnv());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "questpulse-api", mode: "read-only" });
});

test("opportunities endpoint returns safe public records", async () => {
  const row = { id: "telegram-bots", type: "telegram", status: "unverified", availability: "unknown", riskLevel: "unrated", privateNote: "must not leak" };
  const response = await handleRequest(new Request("https://api.test/api/opportunities"), makeEnv([row]));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.data[0].id, "telegram-bots");
  assert.equal("privateNote" in body.data[0], false);
});

test("unknown record returns 404", async () => {
  const response = await handleRequest(new Request("https://api.test/api/opportunities/missing"), makeEnv());
  assert.equal(response.status, 404);
});

test("invalid filters return 400", async () => {
  const response = await handleRequest(new Request("https://api.test/api/opportunities?status=approved"), makeEnv());
  assert.equal(response.status, 400);
});

test("write methods are rejected", async () => {
  const response = await handleRequest(new Request("https://api.test/api/opportunities", { method: "POST" }), makeEnv());
  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET, OPTIONS");
});

test("missing database returns 503", async () => {
  const response = await handleRequest(new Request("https://api.test/api/opportunities"), { ALLOWED_ORIGIN: "*" });
  assert.equal(response.status, 503);
});

test("CORS is restricted to configured website origin", async () => {
  const response = await handleRequest(new Request("https://api.test/api/health", { headers: { Origin: "https://other.example" } }), makeEnv());
  assert.equal(response.headers.get("access-control-allow-origin"), "https://getquestpulse.com");
});
