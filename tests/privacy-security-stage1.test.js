const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("public directory uses a restricted RPC instead of selecting the profile table", () => {
  const service = read("js/services/supabase-service.js");
  const listMethod = service.match(
    /async function getProfessionalProfiles\(\)[\s\S]*?\n  }\n\n  async function getProfessionalProfileById/
  );
  const detailMethod = service.match(
    /async function getProfessionalProfileById\(id\)[\s\S]*?\n  }\n\n  async function getCurrentUserProfile/
  );

  assert.ok(listMethod);
  assert.ok(detailMethod);
  assert.match(listMethod[0], /rpc\("list_public_professional_profiles"/);
  assert.match(detailMethod[0], /rpc\("list_public_professional_profiles"/);
  assert.doesNotMatch(listMethod[0], /select\("\*"\)/);
  assert.doesNotMatch(detailMethod[0], /select\("\*"\)/);
});

test("database migration exposes only intended public profile columns", () => {
  const migration = read("docs/supabase-security-privacy-stage1.sql");
  const returnColumns = migration.match(/returns table \(([\s\S]*?)\)\n+language sql/);

  assert.ok(returnColumns);
  assert.match(returnColumns[1], /id uuid/);
  assert.match(returnColumns[1], /name text/);
  assert.match(returnColumns[1], /occupation text/);
  assert.match(returnColumns[1], /phone text/);
  assert.match(returnColumns[1], /zone text/);
  assert.match(returnColumns[1], /description text/);
  assert.match(returnColumns[1], /photo_url text/);
  assert.doesNotMatch(returnColumns[1], /user_id|terms_|privacy_|reviewed_|moderation_|created_at/);
  assert.match(migration, /revoke select on public\.professional_profiles from anon/);
  assert.match(migration, /revoke all on function[\s\S]*from public, anon, authenticated/);
});

test("profile photos are validated, re-encoded and old files are cleaned", () => {
  const html = read("mi-perfil.html");
  const page = read("js/pages/my-profile-page.js");
  const service = read("js/services/supabase-service.js");
  const migration = read("docs/supabase-security-privacy-stage1.sql");

  assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(service, /maxProfilePhotoInputBytes = 8 \* 1024 \* 1024/);
  assert.match(service, /hasValidImageSignature/);
  assert.match(service, /canvas\.toBlob/);
  assert.match(service, /"image\/webp"/);
  assert.match(page, /removeSupersededCurrentUserProfilePhotos/);
  assert.match(page, /removeCurrentUserProfilePhotoFile\(uploadedPhotoUrl\)/);
  assert.match(migration, /file_size_limit = 5242880/);
  assert.match(migration, /allowed_mime_types = array\['image\/webp'\]/);
});

test("preflight and rollback scripts exist and do not delete current data", () => {
  const preflight = read("docs/supabase-security-privacy-stage1-preflight.sql");
  const rollback = read("docs/supabase-security-privacy-stage1-rollback.sql");
  const migration = read("docs/supabase-security-privacy-stage1.sql");

  assert.match(preflight, /from pg_policies/);
  assert.match(preflight, /from storage\.buckets/);
  assert.match(rollback, /drop function if exists public\.list_public_professional_profiles/);
  assert.doesNotMatch(migration, /delete\s+from\s+public\.professional_profiles/i);
  assert.doesNotMatch(migration, /delete\s+from\s+storage\.objects/i);
});

test("public profiles keep phone numbers behind the WhatsApp action", () => {
  const detailRenderer = read("js/renderers/professional-detail-renderer.js");
  const helpers = read("js/renderers/render-helpers.js");

  assert.doesNotMatch(detailRenderer, /\["Telefono",\s*profile\.user\.phone\]/);
  assert.match(helpers, /Contactar por WhatsApp/);
});
