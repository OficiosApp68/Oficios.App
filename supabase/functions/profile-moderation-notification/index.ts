import { withSupabase } from "jsr:@supabase/server@^1";

type ModerationRecord = {
  id?: string;
  user_id?: string;
  name?: string;
  display_name?: string;
  occupation?: string;
  zone?: string;
  moderation_status?: string;
  status?: string;
  created_at?: string;
  reviewed_at?: string | null;
};

type DatabaseWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE";
  table?: string;
  schema?: string;
  record?: ModerationRecord | null;
  old_record?: ModerationRecord | null;
  recipient_email?: string | null;
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

function cleanEmail(value: unknown) {
  const email = String(value || "").replace(/[\r\n]+/g, "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
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

  const record = payload.record;
  const previousRecord = payload.old_record;
  const isInsert = payload.type === "INSERT";
  const isProfile = payload.table === "professional_profiles";
  const isReviewerAccount = payload.table === "reviewer_accounts";
  const currentStatus = isProfile ? record?.moderation_status : record?.status;
  const previousStatus = isProfile ? previousRecord?.moderation_status : previousRecord?.status;
  const enteredPending = currentStatus === "pending" && (isInsert || previousStatus !== "pending");
  const enteredApproved = payload.type === "UPDATE" && currentStatus === "approved" && previousStatus !== "approved";

  if ((!isProfile && !isReviewerAccount) || !record || (!enteredPending && !enteredApproved)) {
    return Response.json({ ignored: true });
  }

  const apiKey = Deno.env.get("BREVO_API_KEY") || "";
  const adminEmail = cleanEmail(Deno.env.get("ADMIN_NOTIFICATION_EMAIL"));
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL") || "";
  const senderName = Deno.env.get("BREVO_SENDER_NAME") || "OFICIOS APP";
  const moderationUrl = Deno.env.get("ADMIN_MODERATION_URL") || "";
  const reviewsModerationUrl =
    Deno.env.get("ADMIN_REVIEWS_URL") || moderationUrl.replace(/admin-moderacion\.html.*$/, "admin-valoraciones.html");
  const profileUrl = Deno.env.get("MY_PROFILE_URL") || moderationUrl.replace(/admin-moderacion\.html.*$/, "mi-perfil.html");
  const directoryUrl = moderationUrl.replace(/admin-moderacion\.html.*$/, "index.html#profesionales");
  const userEmail = cleanEmail(payload.recipient_email);

  if (!apiKey || !senderEmail || !moderationUrl || (enteredPending && !adminEmail) || (enteredApproved && !userEmail)) {
    return Response.json({ error: "Notification settings are incomplete" }, { status: 500 });
  }

  const name = cleanHeaderText(isProfile ? record.name : record.display_name, "Registro sin nombre");
  const occupation = cleanHeaderText(record.occupation, "Oficio sin completar");
  const zone = cleanHeaderText(record.zone, "Zona sin completar");
  const eventLabel = isReviewerAccount ? "Nueva cuenta para valorar" : isInsert ? "Nuevo perfil" : "Perfil modificado";
  const targetUrl = enteredApproved
    ? isReviewerAccount ? directoryUrl : profileUrl
    : isReviewerAccount ? reviewsModerationUrl : moderationUrl;
  const subject = enteredApproved
    ? isReviewerAccount ? "Tu cuenta para valorar fue aprobada" : "Tu perfil fue aprobado en OFICIOS APP"
    : `${eventLabel} pendiente: ${name}`;
  const idempotencySeed = [
    payload.table,
    payload.type,
    record.id || record.user_id,
    record.created_at,
    currentStatus,
    previousRecord?.reviewed_at || "new",
  ].join(":");
  const idempotencyKey = await sha256(idempotencySeed);
  let textContent: string;
  let htmlContent: string;

  if (enteredApproved) {
    const approvalTitle = isReviewerAccount ? "¡Tu cuenta para valorar fue aprobada!" : "¡Tu perfil fue aprobado!";
    const approvalMessage = isReviewerAccount
      ? "Ya podés valorar con estrellas los oficios y emprendimientos que hayas contratado."
      : "Tu perfil ya está publicado en OFICIOS APP. Podés actualizarlo cuando quieras para agregar o cambiar la foto, ampliar la descripción, revisar tu zona de trabajo y completar más detalles.";
    const actionLabel = isReviewerAccount ? "Buscar oficios" : "Actualizar mi perfil";
    textContent = [`Hola ${name}.`, approvalTitle, approvalMessage, `${actionLabel}: ${targetUrl}`].join("\n\n");
    htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.55;color:#17202d;max-width:620px;margin:auto">
        <div style="padding:24px;border:1px solid #dbe7e6;border-radius:8px;background:#ffffff">
          <p style="margin:0 0 12px;color:#0f766e;font-weight:700">OFICIOS APP</p>
          <h2 style="margin:0 0 16px">${escapeHtml(approvalTitle)}</h2>
          <p>Hola ${escapeHtml(name)}.</p>
          <p>${escapeHtml(approvalMessage)}</p>
          <p style="margin-top:24px">
            <a href="${escapeHtml(targetUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px">
              ${escapeHtml(actionLabel)}
            </a>
          </p>
        </div>
      </div>
    `;
  } else {
    const detailLines = isReviewerAccount
      ? [`Nombre: ${name}`, "Tipo: cuenta privada para valorar"]
      : [`Nombre: ${name}`, `Oficio: ${occupation}`, `Zona: ${zone}`];
    textContent = [`${eventLabel} pendiente de aprobación en OFICIOS APP.`, ...detailLines, `Revisar: ${targetUrl}`].join("\n");
    const htmlDetails = isReviewerAccount
      ? `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Tipo:</strong> cuenta privada para valorar</p>`
      : `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p><p><strong>Oficio:</strong> ${escapeHtml(occupation)}</p><p><strong>Zona:</strong> ${escapeHtml(zone)}</p>`;
    htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#17202d">
        <h2 style="margin:0 0 16px">${escapeHtml(eventLabel)} pendiente de aprobación</h2>
        ${htmlDetails}
        <p style="margin-top:24px">
          <a href="${escapeHtml(targetUrl)}" style="display:inline-block;padding:12px 18px;background:#0f766e;color:#fff;text-decoration:none;border-radius:6px">
            Revisar en Administración
          </a>
        </p>
      </div>
    `;
  }

  const emailResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ name: enteredApproved ? name : "Administración OFICIOS APP", email: enteredApproved ? userEmail : adminEmail }],
      subject,
      htmlContent,
      textContent,
      headers: { "Idempotency-Key": idempotencyKey },
      tags: [enteredApproved ? "registration-approved" : isReviewerAccount ? "reviewer-moderation" : "profile-moderation"],
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
