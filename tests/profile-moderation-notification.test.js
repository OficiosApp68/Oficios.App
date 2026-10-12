const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("moderation notification supports profiles and reviewer accounts without exposing credentials", () => {
  const source = read("supabase/functions/profile-moderation-notification/index.ts");

  assert.match(source, /Deno\.env\.get\("BREVO_API_KEY"\)/);
  assert.match(source, /Deno\.env\.get\("PROFILE_WEBHOOK_SECRET"\)/);
  assert.match(source, /withSupabase\(\{ auth: "none" \}/);
  assert.match(source, /payload\.table === "professional_profiles"/);
  assert.match(source, /payload\.table === "reviewer_accounts"/);
  assert.match(source, /previousStatus !== "pending"/);
  assert.match(source, /Nueva cuenta para valorar/);
  assert.match(source, /admin-valoraciones\.html/);
  assert.match(source, /Tu perfil fue aprobado en OFICIOS APP/);
  assert.match(source, /Actualizar mi perfil/);
  assert.match(source, /payload\.recipient_email/);
  assert.match(source, /registration-approved/);
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

test("notification trigger handles pending and approved transitions without repeating events", () => {
  const sql = read("supabase/migrations/20261004010000_reviewer_moderation_notifications.sql");

  assert.match(sql, /tg_table_name = 'reviewer_accounts'/);
  assert.match(sql, /current_status = 'pending'/);
  assert.match(sql, /previous_status <> 'pending'/);
  assert.match(sql, /after insert or update of status/);
  assert.match(sql, /on public\.reviewer_accounts/);
  assert.match(sql, /vault\.decrypted_secrets/);
  assert.match(sql, /current_status = 'approved'/);
  assert.match(sql, /from auth\.users/);
  assert.match(sql, /'recipient_email', recipient_email/);
  assert.match(sql, /reviewed_at >= now\(\) - interval '24 hours'/);
  assert.match(sql, /'table', 'professional_profiles'/);
  assert.doesNotMatch(sql, /xkeysib-[A-Za-z0-9_-]+/);
});
