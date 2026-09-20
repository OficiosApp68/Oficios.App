const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("moderation notification protects credentials and avoids repeated pending emails", () => {
  const source = read("supabase/functions/profile-moderation-notification/index.ts");

  assert.match(source, /Deno\.env\.get\("BREVO_API_KEY"\)/);
  assert.match(source, /Deno\.env\.get\("PROFILE_WEBHOOK_SECRET"\)/);
  assert.match(source, /withSupabase\(\{ auth: "none" \}/);
  assert.match(source, /previousProfile\?\.moderation_status !== "pending"/);
  assert.match(source, /payload\.table !== "professional_profiles"/);
  assert.match(source, /Idempotency-Key/);
  assert.doesNotMatch(source, /xkeysib-[A-Za-z0-9_-]+/);
});

test("database trigger only notifies when a profile enters moderation", () => {
  const sql = read("docs/supabase-moderation-notifications.sql");

  assert.match(sql, /new\.moderation_status <> 'pending'/);
  assert.match(sql, /old\.moderation_status = 'pending'/);
  assert.match(sql, /vault\.decrypted_secrets/);
  assert.match(sql, /'Authorization', 'Bearer ' \|\| publishable_key/);
  assert.match(sql, /x-webhook-secret/);
  assert.match(sql, /after insert or update of moderation_status/);
  assert.doesNotMatch(sql, /xkeysib-[A-Za-z0-9_-]+/);
});
