import { createClient } from "jsr:@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://oficiosapp68.github.io",
  "http://127.0.0.1:8000",
]);

function getCorsHeaders(origin: string) {
  return {
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://oficiosapp68.github.io",
    vary: "Origin",
  };
}

function jsonResponse(origin: string, body: Record<string, unknown>, status = 200) {
  return Response.json(body, {
    status,
    headers: getCorsHeaders(origin),
  });
}

async function listAllProfilePhotoPaths(adminClient: ReturnType<typeof createClient>, userId: string) {
  const paths: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await adminClient.storage.from("profile-photos").list(userId, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;

    const pagePaths = (data || [])
      .filter((item) => item && item.name)
      .map((item) => `${userId}/${item.name}`);
    paths.push(...pagePaths);

    if (pagePaths.length < 100) break;
    offset += pagePaths.length;
  }

  return paths;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") || "";

  if (request.method === "OPTIONS") {
    if (!allowedOrigins.has(origin)) {
      return jsonResponse(origin, { error: "Origin not allowed" }, 403);
    }

    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (request.method !== "POST") {
    return jsonResponse(origin, { error: "Method not allowed" }, 405);
  }

  if (!allowedOrigins.has(origin)) {
    return jsonResponse(origin, { error: "Origin not allowed" }, 403);
  }

  const authorization = request.headers.get("authorization") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  if (!authorization.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(origin, { error: "Unauthorized" }, 401);
  }

  let payload: { confirmation?: string };

  try {
    payload = await request.json();
  } catch (_) {
    return jsonResponse(origin, { error: "Invalid JSON" }, 400);
  }

  if (payload.confirmation !== "ELIMINAR") {
    return jsonResponse(origin, { error: "Confirmation required" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return jsonResponse(origin, { error: "Unauthorized" }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const photoPaths = await listAllProfilePhotoPaths(adminClient, user.id);

    if (photoPaths.length) {
      const { error: storageError } = await adminClient.storage.from("profile-photos").remove(photoPaths);
      if (storageError) throw storageError;
    }

    const { error: profileError } = await adminClient
      .from("professional_profiles")
      .delete()
      .eq("user_id", user.id);
    if (profileError) throw profileError;

    const { error: authError } = await adminClient.auth.admin.deleteUser(user.id);
    if (authError) throw authError;

    return jsonResponse(origin, { deleted: true });
  } catch (error) {
    console.error("Account deletion failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return jsonResponse(origin, { error: "Account deletion failed" }, 500);
  }
});

