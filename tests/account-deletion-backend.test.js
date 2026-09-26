const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function read(path) {
  return readFileSync(join(__dirname, "..", path), "utf8");
}

test("account deletion backend requires the signed-in user and explicit confirmation", () => {
  const source = read("supabase/functions/delete-account/index.ts");

  assert.match(source, /authorization\.startsWith\("Bearer "\)/);
  assert.match(source, /userClient\.auth\.getUser\(\)/);
  assert.match(source, /payload\.confirmation !== "ELIMINAR"/);
  assert.match(source, /allowedOrigins\.has\(origin\)/);
});

test("account deletion backend removes photos, profile and Auth user", () => {
  const source = read("supabase/functions/delete-account/index.ts");
  const storageRemoval = source.indexOf('.from("profile-photos").remove(photoPaths)');
  const profileRemoval = source.indexOf('.from("professional_profiles")');
  const authRemoval = source.indexOf("auth.admin.deleteUser(user.id)");

  assert.ok(storageRemoval > -1);
  assert.ok(profileRemoval > storageRemoval);
  assert.ok(authRemoval > profileRemoval);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY[^\n]*(console|Response)/);
});

