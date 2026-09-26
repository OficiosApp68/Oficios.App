import { withSupabase } from "jsr:@supabase/server@^1";

type ProfileRecord = {
  id?: string;
  name?: string;
  occupation?: string;
  zone?: string;
  moderation_status?: string;
  created_at?: string;
  reviewed_at?: string | null;
};

type DatabaseWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: ProfileRecord | null;
  old_record?: ProfileRecord | null;
};

function escapeHtml(value: unknown) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanHeaderText(value: unknown, fallback: string) {
  return String(value || fallback).replace(/[\r\n]+/g, " ").trim() || fallback;
}

function secretsMatch(received: string, expected: string) {
  if (!received || !expected || received.length !== expected.length) return false;

  let difference = 0;
  for (let index = 0; index < received.length; index += 1) {
    difference |= received.charCodeAt(index) ^ expected.charCodeAt(index);
  }

  return difference === 0;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function handleNotification(request: Request) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const webhookSecret = Deno.env.get("PROFILE_WEBHOOK_SECRET") || "";
  const receivedSecret = request.headers.get("x-webhook-secret") || "";

  if (!secretsMatch(receivedSecret, webhookSecret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: DatabaseWebhookPayload;

  try {
    payload = await request.json();
  } catch (_) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profile = payload.record;
  const previousProfile = payload.old_record;
  const isNewProfile = payload.type === "INSERT";
  const enteredPending =
    profile?.moderation_status === "pending" &&
    (isNewProfile || previousProfile?.moderation_status !== "pending");

  if (payload.table !== "professional_profiles" || !profile || !enteredPending) {
    return Response.json({ ignored: true });
  }

  const apiKey = Deno.env.get("BREVO_API_KEY") || "";
  const recipientEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL") || "";
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "";
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "OFICIOS APP";
  const moderationUrl = Deno.env.get("ADMIN_MODERATION_URL") || "";

  if (!apiKey || !recipientEmail || !senderEmail || !moderationUrl) {
    return Response.json({ error: "Notification settings are incomplete" }, { status: 500 });
  }

  const name = cleanHeaderText(profile.name, "Perfil sin nombre");
  const occupation = cleanHeaderText(profile.occupation, "Oficio sin completar");
  const zone = cleanHeaderText(profile.zone, "Zona sin completar");
  const eventLabel = isNewProfile ? "Nuevo perfil" : "Perfil modificado";
  const subject = `${eventLabel} pendiente: ${name}`;
  const idempotencySeed = [
    payload.type,
    profile.id,
    profile.created_at,
    previousProfile?.reviewed_at || "new",
  ].join(":");
  const idempotencyKey = await sha256(idempotencySeed);
  const textContent = [
    `${eventLabel} pendiente de aprobación en OFICIOS APP.`,
    `Nombre: ${name}`,
    `Oficio: ${occupation}`,
    `Zona: ${zone}`,
    `Revisar: ${moderationUrl}`,
  ].join("\n");
  const htmlContent = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202d">
      <h2 style="margin:0 0 16px">${escapeHtml(eventLabel)} pendiente de aprobación</h2>
      <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
      <p><strong>Oficio:</strong> ${escapeHtml(occupation)}</p>
      <p><strong>Zona:</strong> ${escapeHtml(zone)}</p>
      <p style="margin-top:24px">
        <a href="${escapeHtml(moderationUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px">
          Revisar en Administración
        </a>
      </p>
    </div>
  `;

  const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ name: "Administración OFICIOS APP", email: recipientEmail }],
      subject,
      htmlContent,
      textContent,
      headers: { "Idempotency-Key": idempotencyKey },
      tags: ["profile-moderation"],
    }),
  });

  if (!emailResponse.ok) {
    return Response.json({ error: "Email provider rejected the notification" }, { status: 502 });
  }

  const result = await emailResponse.json();
  return Response.json({ sent: true, messageId: result.messageId || null });
}

export default {
  fetch: withSupabase({ auth: "none" }, handleNotification),
};
