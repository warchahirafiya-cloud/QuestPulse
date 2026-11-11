import test from "node:test";
import assert from "node:assert/strict";
import { postSchema, accountSchema } from "../validation.js";

const validPost = {
  publisherName: "Example",
  postType: "opportunity",
  title: "A valid title",
  description: "This is a sufficiently long description.",
  countries: "Global",
  disclosure: "no"
};

test("accepts all approved post types", () => {
  for (const postType of ["opportunity", "direct_reward", "new_product"]) {
    assert.equal(postSchema.safeParse({ ...validPost, postType }).success, true, postType);
  }
});

test("rejects unapproved post types and unexpected fields", () => {
  assert.equal(postSchema.safeParse({ ...validPost, postType: "crypto" }).success, false);
  assert.equal(postSchema.safeParse({ ...validPost, admin: true }).success, false);
});

test("accepts valid HTTPS links and rejects HTTP, malformed, and credential-bearing URLs", () => {
  for (const offerUrl of ["https://example.com/offer", ""]) {
    assert.equal(postSchema.safeParse({ ...validPost, offerUrl }).success, true, offerUrl);
  }
  for (const offerUrl of ["http://example.com", "javascript:alert(1)", "not a URL", "https://user:pass@example.com"]) {
    assert.equal(postSchema.safeParse({ ...validPost, offerUrl }).success, false, offerUrl);
  }
});

test("validates publisher names, titles, descriptions, and countries", () => {
  for (const patch of [
    { publisherName: "A" },
    { title: "No" },
    { description: "Too short" },
    { countries: " " }
  ]) {
    assert.equal(postSchema.safeParse({ ...validPost, ...patch }).success, false, JSON.stringify(patch));
  }
});

test("accepts only real ISO calendar expiry dates", () => {
  for (const expiresAt of ["2026-12-31", ""]) {
    assert.equal(postSchema.safeParse({ ...validPost, expiresAt }).success, true, expiresAt);
  }
  for (const expiresAt of ["31-12-2026", "2026-02-30", "2026-13-01", "2026-1-01"]) {
    assert.equal(postSchema.safeParse({ ...validPost, expiresAt }).success, false, expiresAt);
  }
});

test("accepts all publisher account types and rejects weak or invalid registration data", () => {
  for (const accountType of ["individual", "legal_entity", "store", "company"]) {
    const result = accountSchema.safeParse({
      displayName: "Test User",
      accountType,
      email: "a@example.com",
      password: "a-very-long-password"
    });
    assert.equal(result.success, true, accountType);
  }
  assert.equal(accountSchema.safeParse({
    displayName: "Test User", accountType: "individual", email: "not-an-email", password: "a-very-long-password"
  }).success, false);
  assert.equal(accountSchema.safeParse({
    displayName: "Test User", accountType: "admin", email: "a@example.com", password: "a-very-long-password"
  }).success, false);
  assert.equal(accountSchema.safeParse({
    displayName: "Test User", accountType: "individual", email: "a@example.com", password: "short"
  }).success, false);
});
