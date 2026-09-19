const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("profile editor exposes the photo removal flow", () => {
  const html = read("mi-perfil.html");
  const page = read("js/pages/my-profile-page.js");
  const service = read("js/services/supabase-service.js");

  assert.match(html, /data-remove-profile-photo[^>]*hidden/);
  assert.match(page, /removeCurrentUserProfilePhoto/);
  assert.match(page, /perfil volverá a revisión/);
  assert.match(service, /path\.startsWith\(`\$\{userId\}\/`\)/);
  assert.match(service, /\.remove\(\[filePath\]\)/);
  assert.match(service, /remove_current_professional_profile_photo/);
});

test("Supabase scripts restrict deletion and clear the profile reference", () => {
  const storageSql = read("docs/supabase-profile-edit.sql");
  const moderationSql = read("docs/supabase-moderation.sql");

  assert.match(storageSql, /for delete[\s\S]*storage\.foldername\(name\)[\s\S]*auth\.uid\(\)/);
  assert.match(moderationSql, /remove_current_professional_profile_photo\(\)/);
  assert.match(moderationSql, /photo_url = null/);
  assert.match(moderationSql, /moderation_status = 'pending'/);
});
