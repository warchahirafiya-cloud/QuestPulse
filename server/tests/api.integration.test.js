import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";

const origin = "http://127.0.0.1";
let root;
let port;
let base;
let child;
let db;

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const value = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return value;
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error("API process exited before becoming healthy.");
    try {
      const response = await fetch(base + "/api/health");
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("API did not become healthy in time.");
}

function cookieFrom(response) {
  const value = response.headers.get("set-cookie");
  assert.ok(value, "login must set a session cookie");
  return value.split(";")[0];
}

async function request(route, options = {}) {
  return fetch(base + route, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "content-type": "application/json" }),
      origin,
      ...(options.headers || {})
    }
  });
}

before(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), "questpulse-api-"));
  port = await freePort();
  base = `http://127.0.0.1:${port}`;
  process.env.DATABASE_PATH = path.join(root, "test.sqlite");
  process.env.UPLOAD_DIR = path.join(root, "uploads");
  process.env.APP_ORIGIN = origin;

  const databaseModule = await import("../db.js");
  db = databaseModule.db;
  const { hashPassword } = await import("../auth.js");
  const passwordHash = await hashPassword("integration-admin-password-2026");
  db.prepare("INSERT INTO users(id,display_name,account_type,email,password_hash,role,status,created_at) VALUES(?,?,?,?,?,'admin','active',?)")
    .run("admin-test", "Integration Admin", "legal_entity", "admin@example.test", passwordHash, new Date().toISOString());

  child = spawn(process.execPath, ["server/app.js"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  await waitForHealth();
});

after(async () => {
  if (child && child.exitCode === null) {
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), new Promise(resolve => setTimeout(resolve, 2000))]);
  }
  db?.close();
  if (root) await rm(root, { recursive: true, force: true });
});

test("HTTP API enforces registration, sessions, publisher roles, moderation, publication and media access", async () => {
  const health = await request("/api/health", { headers: {} });
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const rejectedOrigin = await fetch(base + "/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://attacker.example" },
    body: JSON.stringify({ displayName: "Bad Actor", accountType: "individual", email: "bad@example.test", password: "long-enough-password" })
  });
  assert.equal(rejectedOrigin.status, 403);

  const registration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ displayName: "Test Publisher", accountType: "individual", email: "publisher@example.test", password: "publisher-password-2026" })
  });
  assert.equal(registration.status, 202);
  const registered = await registration.json();
  assert.equal(registered.status, "pending");

  const pendingLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "publisher@example.test", password: "publisher-password-2026" })
  });
  assert.equal(pendingLogin.status, 403);

  const adminLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@example.test", password: "integration-admin-password-2026" })
  });
  assert.equal(adminLogin.status, 200);
  const adminCookie = cookieFrom(adminLogin);

  const adminUsers = await request("/api/admin/users?status=pending", { headers: { cookie: adminCookie } });
  assert.equal(adminUsers.status, 200);
  assert.equal((await adminUsers.json()).users.length, 1);

  const activation = await request(`/api/admin/users/${registered.accountId}/activate`, {
    method: "PATCH", headers: { cookie: adminCookie },
    body: JSON.stringify({ status: "active" })
  });
  assert.equal(activation.status, 200);

  const publisherLogin = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "publisher@example.test", password: "publisher-password-2026" })
  });
  assert.equal(publisherLogin.status, 200);
  const publisherCookie = cookieFrom(publisherLogin);

  const me = await request("/api/auth/me", { headers: { cookie: publisherCookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).user.role, "publisher");

  const forbiddenAdmin = await request("/api/admin/submissions", { headers: { cookie: publisherCookie } });
  assert.equal(forbiddenAdmin.status, 403);

  const unauthenticatedSubmission = await request("/api/posts", { method: "POST", body: new FormData() });
  assert.equal(unauthenticatedSubmission.status, 401);

  const invalidPost = await request("/api/posts", {
    method: "POST", headers: { cookie: publisherCookie }, body: JSON.stringify({ title: "missing required fields" })
  });
  assert.equal(invalidPost.status, 400);

  const spoofedImage = new FormData();
  for (const [key, value] of Object.entries({
    publisherName: "Test Publisher", postType: "opportunity", title: "Spoofed media test",
    description: "This post should fail because the image bytes do not match the declared media type.",
    countries: "Algeria", disclosure: "no"
  })) spoofedImage.set(key, value);
  spoofedImage.append("media", new Blob(["not a real jpeg"], { type: "image/jpeg" }), "spoof.jpg");
  const spoofedResponse = await request("/api/posts", {
    method: "POST", headers: { cookie: publisherCookie }, body: spoofedImage
  });
  assert.equal(spoofedResponse.status, 400);
  assert.deepEqual(await readdir(path.join(root, "uploads")), []);

  const partialUpload = new FormData();
  for (const [key, value] of Object.entries({
    publisherName: "Test Publisher", postType: "opportunity", title: "Partial upload cleanup",
    description: "The first valid file must be removed when the second file is rejected.",
    countries: "Algeria", disclosure: "no"
  })) partialUpload.set(key, value);
  partialUpload.append("media", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3, 4, 5])], { type: "image/jpeg" }), "first.jpg");
  partialUpload.append("media", new Blob(["not allowed"], { type: "text/plain" }), "second.txt");
  const partialResponse = await request("/api/posts", {
    method: "POST", headers: { cookie: publisherCookie }, body: partialUpload
  });
  assert.equal(partialResponse.status, 400);
  assert.deepEqual(await readdir(path.join(root, "uploads")), []);

  const postForm = new FormData();
  for (const [key, value] of Object.entries({
    publisherName: "Test Publisher",
    postType: "opportunity",
    title: "Integration test opportunity",
    description: "A sufficiently detailed opportunity description for the HTTP integration suite.",
    countries: "Algeria",
    disclosure: "no"
  })) postForm.set(key, value);
  postForm.append("media", new Blob([Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0, 1, 2, 3, 4, 5])], { type: "image/jpeg" }), "proof.jpg");

  const submission = await request("/api/posts", {
    method: "POST", headers: { cookie: publisherCookie }, body: postForm
  });
  assert.equal(submission.status, 202);
  const submitted = await submission.json();
  assert.equal(submitted.status, "pending");

  const publicBeforeReview = await request("/api/posts", { headers: {} });
  assert.equal((await publicBeforeReview.json()).posts.length, 0);

  const pendingSubmissions = await request("/api/admin/submissions?status=pending", { headers: { cookie: adminCookie } });
  assert.equal(pendingSubmissions.status, 200);
  const items = (await pendingSubmissions.json()).submissions;
  assert.equal(items.length, 1);
  assert.equal(items[0].media.length, 1);
  const mediaId = items[0].media[0].id;

  const hiddenMedia = await request(`/api/media/${mediaId}`, { headers: {} });
  assert.equal(hiddenMedia.status, 404);

  const approved = await request(`/api/admin/posts/${submitted.postId}/review`, {
    method: "PATCH", headers: { cookie: adminCookie },
    body: JSON.stringify({ action: "approve", note: "Verified by integration test." })
  });
  assert.equal(approved.status, 200);
  assert.equal((await approved.json()).status, "published");

  const publicAfterReview = await request("/api/posts", { headers: {} });
  const published = (await publicAfterReview.json()).posts;
  assert.equal(published.length, 1);
  assert.equal(published[0].id, submitted.postId);

  const visibleMedia = await request(`/api/media/${mediaId}`, { headers: {} });
  assert.equal(visibleMedia.status, 200);
  assert.equal(visibleMedia.headers.get("x-content-type-options"), "nosniff");

  const logout = await request("/api/auth/logout", {
    method: "POST", headers: { cookie: publisherCookie }, body: "{}"
  });
  assert.equal(logout.status, 204);
  const expiredSession = await request("/api/auth/me", { headers: { cookie: publisherCookie } });
  assert.equal(expiredSession.status, 401);
});
