const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("reviewer accounts and ratings are private, authenticated and moderated", () => {
  const sql = read("supabase/migrations/20260930210000_profile_reviews.sql");

  assert.match(sql, /create table public\.reviewer_accounts/);
  assert.match(sql, /user_id uuid primary key references auth\.users/);
  assert.match(sql, /status in \('pending', 'approved', 'rejected'\)/);
  assert.match(sql, /email_confirmed_at is not null/);
  assert.match(sql, /create table public\.profile_reviews/);
  assert.match(sql, /reviewer_user_id uuid not null references auth\.users/);
  assert.match(sql, /unique \(profile_id, reviewer_user_id\)/);
  assert.match(sql, /alter table public\.reviewer_accounts enable row level security/);
  assert.match(sql, /alter table public\.profile_reviews enable row level security/);
  assert.match(sql, /revoke all on table public\.reviewer_accounts from public, anon, authenticated/);
  assert.match(sql, /revoke all on table public\.profile_reviews from public, anon, authenticated/);
  assert.match(sql, /public\.is_app_admin\(\)/);
  assert.match(sql, /where user_id = current_user_id and status = 'approved'/);
  assert.match(sql, /review\.status = 'approved'/);
  assert.doesNotMatch(sql, /reviewer_email|comment text|verification_token|source_fingerprint/);
  assert.match(sql, /profile_reviews_migration_snapshot/);
  assert.match(sql, /Safety check failed/);
  assert.doesNotMatch(sql, /delete from public\.professional_profiles/i);
  assert.doesNotMatch(sql, /delete from auth\.users/i);
  assert.doesNotMatch(sql, /delete from storage\.objects/i);
});

test("review registration requires confirmation, acceptance and administrative approval", () => {
  const registration = read("registro-valoracion.html");
  const registrationPage = read("js/pages/reviewer-register-page.js");
  const auth = read("js/services/auth-service.js");

  assert.match(registration, /Cuenta para valorar/);
  assert.match(registration, /Esta cuenta no crea un perfil publico/);
  assert.match(registration, /data-reviewer-terms/);
  assert.match(registrationPage, /account_type: "reviewer"/);
  assert.match(registrationPage, /registerReviewerAccount/);
  assert.match(registrationPage, /pendiente de aprobacion/);
  assert.match(auth, /options\.redirectPath/);
});

test("profile UI accepts stars only from an approved reviewer account", () => {
  const renderer = read("js/renderers/professional-detail-renderer.js");
  const page = read("js/pages/professional-page.js");
  const admin = read("admin-valoraciones.html");
  const adminPage = read("js/pages/admin-reviews-page.js");

  assert.match(renderer, /necesitas una cuenta confirmada y aprobada/);
  assert.match(renderer, /Tu nombre y tu email no se publican/);
  assert.match(page, /getCurrentReviewerAccount/);
  assert.match(page, /registro-valoracion\.html/);
  assert.match(page, /submitProfileReview/);
  assert.match(renderer, /data-review-access/);
  assert.doesNotMatch(page, /reviewerName|comment|captchaToken/);
  assert.match(admin, /Cuentas para valorar/);
  assert.match(adminPage, /Aprobar cuenta/);
  assert.match(adminPage, /Aprobar<\/button>/);
  assert.match(adminPage, /Rechazar<\/button>/);
});
