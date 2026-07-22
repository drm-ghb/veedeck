import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/validation";
import {
  activationEmailPL, activationEmailEN,
  resetEmailPL, resetEmailEN,
  trialMidpointEmailPL, trialMidpointEmailEN,
  trialDay7EmailPL, trialDay7EmailEN,
  trialDay3EmailPL, trialDay3EmailEN,
  trialEndedEmailPL, trialEndedEmailEN,
  teamInvitationEmailPL, teamInvitationEmailEN,
  clientInvitationEmailPL, clientInvitationEmailEN,
  paymentFailedEmailPL, paymentFailedEmailEN,
} from "@/lib/email-templates";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", // true dla portu 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME ?? "Widek"}" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

export async function sendActivationEmail({
  to,
  token,
  locale = "pl",
}: {
  to: string;
  token: string;
  locale?: "pl" | "en";
}) {
  const link = `${APP_URL}/api/auth/activate/${token}`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL ? "Aktywuj swoje konto veedeck" : "Activate your veedeck account",
    html: isPL ? activationEmailPL(link) : activationEmailEN(link),
  });
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
  locale = "pl",
}: {
  to: string;
  resetUrl: string;
  locale?: "pl" | "en";
}) {
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL ? "Reset hasła w veedeck" : "Reset your veedeck password",
    html: isPL ? resetEmailPL(resetUrl) : resetEmailEN(resetUrl),
  });
}

export async function sendTrialMidpointEmail({
  to,
  locale = "pl",
}: {
  to: string;
  locale?: "pl" | "en";
}) {
  const upgradeUrl = `${APP_URL}/ustawienia/plan-i-rozliczenia`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? "Zostało 15 dni okresu próbnego veedeck"
      : "Your veedeck trial ends in 15 days",
    html: isPL ? trialMidpointEmailPL(upgradeUrl) : trialMidpointEmailEN(upgradeUrl),
  });
}

export async function sendTrialDay7Email({
  to,
  locale = "pl",
}: {
  to: string;
  locale?: "pl" | "en";
}) {
  const upgradeUrl = `${APP_URL}/ustawienia/plan-i-rozliczenia`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? "Został Ci tylko tydzień z veedeck"
      : "Only one week left with veedeck",
    html: isPL ? trialDay7EmailPL(upgradeUrl) : trialDay7EmailEN(upgradeUrl),
  });
}

export async function sendTrialDay3Email({
  to,
  locale = "pl",
}: {
  to: string;
  locale?: "pl" | "en";
}) {
  const upgradeUrl = `${APP_URL}/ustawienia/plan-i-rozliczenia`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? "Zostały Ci tylko 3 dni z veedeck"
      : "Only 3 days left with veedeck",
    html: isPL ? trialDay3EmailPL(upgradeUrl) : trialDay3EmailEN(upgradeUrl),
  });
}

export async function sendTrialEndedEmail({
  to,
  locale = "pl",
}: {
  to: string;
  locale?: "pl" | "en";
}) {
  const upgradeUrl = `${APP_URL}/ustawienia/plan-i-rozliczenia`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? "Twój okres próbny veedeck się zakończył"
      : "Your veedeck trial has ended",
    html: isPL ? trialEndedEmailPL(upgradeUrl) : trialEndedEmailEN(upgradeUrl),
  });
}

export async function sendClientInvitationEmail({
  to,
  designerName,
  token,
  locale = "pl",
}: {
  to: string;
  designerName: string;
  token: string;
  locale?: "pl" | "en";
}) {
  const link = `${APP_URL}/client-invite/${token}`;
  const safeDesignerName = escapeHtml(designerName);
  const isPL = locale !== "en";

  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? `Zaproszenie od projektanta — ${safeDesignerName}`
      : `Project invitation from ${safeDesignerName}`,
    html: isPL
      ? clientInvitationEmailPL({ inviteUrl: link, designerName: safeDesignerName })
      : clientInvitationEmailEN({ inviteUrl: link, designerName: safeDesignerName }),
  });
}

export async function sendInvitationEmail({
  to,
  designerName,
  token,
  locale = "pl",
}: {
  to: string;
  designerName: string;
  token: string;
  locale?: "pl" | "en";
}) {
  const link = `${APP_URL}/invite/${token}`;
  const safeDesignerName = escapeHtml(designerName);
  const isPL = locale !== "en";

  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? `Zaproszenie do panelu projektanta — ${safeDesignerName}`
      : `Designer panel invitation — ${safeDesignerName}`,
    html: isPL
      ? teamInvitationEmailPL({ inviteUrl: link, designerName: safeDesignerName })
      : teamInvitationEmailEN({ inviteUrl: link, designerName: safeDesignerName }),
  });
}

// ─── Notification emails ───────────────────────────────────────────────────────
//
// To activate: podepnij Resend (lub użyj istniejącego transportera nodemailer).
// Teraz funkcje logują tylko do konsoli — gotowe do podpięcia API.
//
// Żeby użyć Resend:
//   1. npm install resend
//   2. Dodaj RESEND_API_KEY do .env
//   3. Zastąp ciało sendNotificationEmail() wywołaniem Resend

async function sendNotificationEmail(to: string, subject: string, html: string): Promise<void> {
  if (!to || !to.includes("@") || to.endsWith("@client.internal")) return;

  // TODO: zastąp poniższy log wywołaniem Resend lub transporter.sendMail():
  //
  // await transporter.sendMail({ from: FROM, to, subject, html });
  //
  // lub Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: "noreply@veedeck.com", to, subject, html });

  console.log(`[EMAIL NOTIF] to=${to} subject="${subject}"`);
}

function emailBase(content: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:system-ui,-apple-system,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <tr><td style="background:#4F46E5;padding:20px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="vertical-align:middle;padding-right:8px;"><img src="https://veedeck.com/logo.png" alt="veedeck" width="20" height="20" style="display:block;width:20px;height:20px;"></td>
              <td style="vertical-align:middle;color:#fff;font-size:18px;font-weight:700;letter-spacing:-.3px;">veedeck</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:32px;">
          ${content}
        </td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">To jest automatyczna wiadomość z platformy Veedeck. Nie odpowiadaj na ten email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function emailBtn(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:20px;padding:10px 22px;background:#4F46E5;color:#fff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>`;
}

export async function notifyDesignerNewPin(opts: {
  designerEmail: string;
  projectTitle: string;
  renderName: string;
  author: string;
  content: string;
  projectId: string;
  renderId: string;
  commentId: string;
}) {
  const link = `${APP_URL}/projekty/${opts.projectId}/renders/${opts.renderId}?pinId=${opts.commentId}`;
  await sendNotificationEmail(
    opts.designerEmail,
    `Nowy pin w projekcie „${opts.projectTitle}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowy pin od klienta</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${escapeHtml(opts.author)} · ${escapeHtml(opts.renderName)} · <strong>${escapeHtml(opts.projectTitle)}</strong></p>
      <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(opts.content)}</p>
      ${emailBtn("Przejdź do rendera", link)}
    `),
  );
}

export async function notifyDesignerNewComment(opts: {
  designerEmail: string;
  projectTitle: string;
  renderName: string;
  author: string;
  content: string;
  projectId: string;
  renderId: string;
  commentId: string;
}) {
  const link = `${APP_URL}/projekty/${opts.projectId}/renders/${opts.renderId}?chatId=${opts.commentId}`;
  await sendNotificationEmail(
    opts.designerEmail,
    `Nowa wiadomość w projekcie „${opts.projectTitle}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowa wiadomość od klienta</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${escapeHtml(opts.author)} · ${escapeHtml(opts.renderName)} · <strong>${escapeHtml(opts.projectTitle)}</strong></p>
      <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(opts.content)}</p>
      ${emailBtn("Przejdź do dyskusji", link)}
    `),
  );
}

export async function notifyDesignerNewListComment(opts: {
  designerEmail: string;
  listName: string;
  listPath: string;
  productName: string;
  productId: string;
  author: string;
  content: string;
}) {
  const link = `${APP_URL}/listy/${opts.listPath}?product=${opts.productId}`;
  await sendNotificationEmail(
    opts.designerEmail,
    `Nowy komentarz na liście „${opts.listName}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowy komentarz do produktu</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${escapeHtml(opts.author)} · ${escapeHtml(opts.productName)} · <strong>${escapeHtml(opts.listName)}</strong></p>
      <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(opts.content)}</p>
      ${emailBtn("Przejdź do listy", link)}
    `),
  );
}

export async function notifyDesignerStatusRequest(opts: {
  designerEmail: string;
  projectTitle: string;
  projectId: string;
  renderId: string;
  renderName: string;
  clientName: string;
}) {
  const link = `${APP_URL}/projekty/${opts.projectId}/renders/${opts.renderId}`;
  await sendNotificationEmail(
    opts.designerEmail,
    `Prośba o zmianę statusu w projekcie „${opts.projectTitle}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Prośba o zmianę statusu</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;"><strong>${escapeHtml(opts.clientName)}</strong> prosi o zmianę statusu pliku <strong>${escapeHtml(opts.renderName)}</strong> na „Do weryfikacji".</p>
      ${emailBtn("Rozpatrz prośbę", link)}
    `),
  );
}

export async function notifyDesignerVersionRequest(opts: {
  designerEmail: string;
  projectTitle: string;
  projectId: string;
  renderId: string;
  renderName: string;
  clientName: string;
  versionNumber: number;
}) {
  const link = `${APP_URL}/projekty/${opts.projectId}/renders/${opts.renderId}`;
  await sendNotificationEmail(
    opts.designerEmail,
    `Prośba o przywrócenie wersji w projekcie „${opts.projectTitle}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Prośba o przywrócenie wersji</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;"><strong>${escapeHtml(opts.clientName)}</strong> prosi o przywrócenie wersji <strong>${opts.versionNumber}</strong> pliku <strong>${escapeHtml(opts.renderName)}</strong>.</p>
      ${emailBtn("Rozpatrz prośbę", link)}
    `),
  );
}

// ─── Digest email ────────────────────────────────────────────────────────────

type DigestLocale = "pl" | "en";

const DIGEST_META: Record<string, { label: Record<DigestLocale, string>; emoji: string; color: string }> = {
  discussion_message: { emoji: "💬", color: "#4F46E5", label: { pl: "Nowa wiadomość",        en: "New message" } },
  pin:              { emoji: "📍", color: "#4F46E5", label: { pl: "Nowy pin",              en: "New pin" } },
  comment:          { emoji: "💬", color: "#4F46E5", label: { pl: "Nowy komentarz",        en: "New comment" } },
  list_comment:     { emoji: "🛍️", color: "#4F46E5", label: { pl: "Komentarz do produktu", en: "Product comment" } },
  product_approved: { emoji: "✓",  color: "#1E9E63", label: { pl: "Zatwierdzono produkt",  en: "Product approved" } },
  product_rejected: { emoji: "✕",  color: "#D6473C", label: { pl: "Odrzucono produkt",     en: "Product rejected" } },
  status_request:   { emoji: "⏳", color: "#8A8D9A", label: { pl: "Prośba o status",       en: "Status request" } },
  version_request:  { emoji: "↺",  color: "#8A8D9A", label: { pl: "Przywrócenie wersji",   en: "Version restore" } },
  survey_submitted: { emoji: "📋", color: "#4F46E5", label: { pl: "Wypełniono ankietę",    en: "Survey submitted" } },
};

function buildDigestEventRow(
  item: { type: string; payload: Record<string, unknown> },
  locale: DigestLocale,
  APP: string,
): string {
  const p = item.payload;
  const meta = DIGEST_META[item.type];
  const label = meta ? `${meta.emoji} ${meta.label[locale]}` : item.type;
  const color = meta?.color ?? "#4F46E5";
  const goLabel = locale === "pl" ? "Przejdź →" : "View →";

  let detail = "";
  let quote = "";
  let link = "";

  if (item.type === "discussion_message") {
    const from = locale === "pl" ? "od" : "from";
    detail = `<strong>${escapeHtml(String(p.authorName))}</strong> ${from} <strong>${escapeHtml(String(p.projectTitle ?? p.assignmentTitle ?? p.discussionTitle ?? ""))}</strong>`;
    if (p.content) quote = escapeHtml(String(p.content)).slice(0, 200);
    link = p.projectId ? `${APP}/projekty/${p.projectId}` : "";
  } else if (item.type === "pin" || item.type === "comment") {
    detail = `<strong>${escapeHtml(String(p.author))}</strong> · ${escapeHtml(String(p.renderName))} · <strong>${escapeHtml(String(p.projectTitle))}</strong>`;
    quote = escapeHtml(String(p.content));
    const param = item.type === "pin" ? `pinId=${p.commentId}` : `chatId=${p.commentId}`;
    link = `${APP}/projekty/${p.projectId}/renders/${p.renderId}?${param}`;
  } else if (item.type === "list_comment") {
    detail = `<strong>${escapeHtml(String(p.author))}</strong> · ${escapeHtml(String(p.productName))} · <strong>${escapeHtml(String(p.listName))}</strong>`;
    quote = escapeHtml(String(p.content));
    link = `${APP}/listy-zakupowe/${p.listPath}?product=${p.productId}`;
  } else if (item.type === "product_approved") {
    const verb = locale === "pl" ? "zaakceptował(a)" : "approved";
    const on = locale === "pl" ? "na liście" : "on";
    detail = `<strong>${escapeHtml(String(p.clientName ?? "Klient"))}</strong> ${verb} <strong>${escapeHtml(String(p.productName))}</strong> ${on} <strong>${escapeHtml(String(p.listName))}</strong>`;
    link = `${APP}/listy-zakupowe/${p.listPath}`;
  } else if (item.type === "product_rejected") {
    const verb = locale === "pl" ? "odrzucił(a)" : "rejected";
    const on = locale === "pl" ? "na liście" : "on";
    detail = `<strong>${escapeHtml(String(p.clientName ?? "Klient"))}</strong> ${verb} <strong>${escapeHtml(String(p.productName))}</strong> ${on} <strong>${escapeHtml(String(p.listName))}</strong>`;
    link = `${APP}/listy-zakupowe/${p.listPath}`;
  } else if (item.type === "status_request") {
    const verb = locale === "pl" ? "prosi o zmianę statusu" : "requests a status change for";
    const inProject = locale === "pl" ? "w projekcie" : "in";
    detail = `<strong>${escapeHtml(String(p.clientName))}</strong> ${verb} <strong>${escapeHtml(String(p.renderName))}</strong> ${inProject} <strong>${escapeHtml(String(p.projectTitle))}</strong>`;
    link = `${APP}/projekty/${p.projectId}/renders/${p.renderId}`;
  } else if (item.type === "version_request") {
    const verb = locale === "pl" ? "prosi o przywrócenie wersji" : "requests restoring version";
    const of = locale === "pl" ? "pliku" : "of";
    detail = `<strong>${escapeHtml(String(p.clientName))}</strong> ${verb} ${p.versionNumber} ${of} <strong>${escapeHtml(String(p.renderName))}</strong>`;
    link = `${APP}/projekty/${p.projectId}/renders/${p.renderId}`;
  } else if (item.type === "survey_submitted") {
    const verb = locale === "pl" ? "wypełnił(a) ankietę" : "submitted the survey";
    const who = escapeHtml(String(p.respondentName || p.respondentEmail || (locale === "pl" ? "Klient" : "Client")));
    detail = `<strong>${who}</strong> ${verb} <strong>${escapeHtml(String(p.surveyName))}</strong>`;
    link = `${APP}/ankiety/${p.surveyId}`;
  }

  const quoteBox = quote ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
      <tr>
        <td style="background:#F2F3F7;border-radius:10px;padding:11px 14px;">
          <span style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-style:italic;color:#565A69;">„${quote}"</span>
        </td>
      </tr>
    </table>` : "";

  return `
    <tr>
      <td style="padding:18px 0;border-top:1px solid #E5E7EB;">
        <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${color};">
          ${label}
        </div>
        <div style="margin-top:8px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;line-height:1.5;color:#24252B;">
          ${detail}
        </div>
        ${quoteBox}
        ${link ? `<div style="margin-top:10px;"><a href="${link}" style="font-family:'DM Sans',Arial,sans-serif;font-size:14px;font-weight:600;color:#4F46E5;text-decoration:none;">${goLabel}</a></div>` : ""}
      </td>
    </tr>`;
}

function buildDigestHtml(
  items: { type: string; payload: Record<string, unknown> }[],
  locale: DigestLocale,
  intervalLabel: string,
  APP: string,
): string {
  const count = items.length;
  const isPL = locale === "pl";
  const date = new Date().toLocaleDateString(isPL ? "pl-PL" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  const countLabel = isPL
    ? `${count} ${count === 1 ? "nowe powiadomienie" : "nowych powiadomień"}`
    : `${count} new ${count === 1 ? "notification" : "notifications"}`;
  const settingsUrl = `${APP}/ustawienia/powiadomienia`;

  const eventsHtml = items.map((item) => buildDigestEventRow(item, locale, APP)).join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #EDEDEA; }
  a { color: #4F46E5; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#EDEDEA;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#EDEDEA;font-size:1px;line-height:1px;">
    ${isPL ? "Oto co wydarzyło się od ostatniego podsumowania w veedeck." : "Here's what happened since your last digest in veedeck."}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EDEDEA;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="vertical-align:middle;width:100%;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:8px;">
                          <img src="https://veedeck.com/logo.png" alt="veedeck" width="22" height="22" style="display:block;width:22px;height:22px;">
                        </td>
                        <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">
                          veedeck
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td style="vertical-align:middle;white-space:nowrap;font-family:'DM Sans',Arial,sans-serif;font-size:12.5px;color:#A0A3AE;">
                    ${date}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px 12px;">
                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">
                      ${isPL ? "Podsumowanie powiadomień" : "Notification digest"}
                    </div>
                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      ${isPL ? "Podsumowanie powiadomień" : "Notification digest"}
                    </h1>
                    <p style="margin:14px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      ${isPL ? "Oto co wydarzyło się od ostatniego podsumowania:" : "Here's what happened since your last digest:"}
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0 8px;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:999px;padding:6px 14px;">
                          <span style="font-family:'DM Sans',Arial,sans-serif;font-size:13px;font-weight:600;color:#4F46E5;">
                            ${countLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Events -->
                <tr>
                  <td class="vd-card-pad" style="padding:8px 48px 12px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${eventsHtml}
                    </table>
                  </td>
                </tr>

                <!-- CTA -->
                <tr>
                  <td class="vd-card-pad" style="padding:16px 48px 44px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td align="center" style="border-radius:12px;background:#4F46E5;">
                          <a href="${APP}" style="display:block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                            ${isPL ? "Otwórz veedeck" : "Open veedeck"}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:28px 0 0;"></div>
                    <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#8A8D9A;">
                      ${isPL ? "Częstotliwość:" : "Frequency:"} ${intervalLabel}
                      &nbsp;·&nbsp;
                      <a href="${settingsUrl}" style="color:#4F46E5;text-decoration:underline;">${isPL ? "Zarządzaj powiadomieniami" : "Manage notifications"}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">
                veedeck — Visualize, Design, Deliver.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function digestIntervalLabel(minutes: number, locale: DigestLocale): string {
  const isPL = locale === "pl";
  const map: Record<number, Record<DigestLocale, string>> = {
    15:   { pl: "co 15 minut",    en: "every 15 minutes" },
    30:   { pl: "co 30 minut",    en: "every 30 minutes" },
    60:   { pl: "co godzinę",     en: "every hour" },
    120:  { pl: "co 2 godziny",   en: "every 2 hours" },
    240:  { pl: "co 4 godziny",   en: "every 4 hours" },
    1440: { pl: "raz dziennie",   en: "once a day" },
  };
  return map[minutes]?.[locale] ?? (isPL ? `co ${minutes} min` : `every ${minutes} min`);
}

export async function sendDigestEmail(
  designerEmail: string,
  items: { type: string; payload: Record<string, unknown> }[],
  opts?: { locale?: DigestLocale; intervalMinutes?: number }
) {
  const locale = opts?.locale ?? "pl";
  const intervalMinutes = opts?.intervalMinutes ?? 30;
  const count = items.length;
  const isPL = locale === "pl";
  const subject = isPL
    ? `Masz ${count} ${count === 1 ? "nowe powiadomienie" : "nowych powiadomień"} w veedeck`
    : `You have ${count} new ${count === 1 ? "notification" : "notifications"} in veedeck`;

  const APP = APP_URL;
  const html = buildDigestHtml(items, locale, digestIntervalLabel(intervalMinutes, locale), APP);

  await transporter.sendMail({ from: FROM, to: designerEmail, subject, html });
}

export async function notifyClientDesignerReply(opts: {
  clientEmail: string;
  projectTitle: string;
  projectId: string;
  renderId: string;
  renderName: string;
  designerName: string;
  content: string;
}) {
  const link = `${APP_URL}/projekty/${opts.projectId}/renders/${opts.renderId}`;
  await sendNotificationEmail(
    opts.clientEmail,
    `Projektant odpowiedział w projekcie „${opts.projectTitle}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowa odpowiedź projektanta</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${escapeHtml(opts.designerName)} · ${escapeHtml(opts.renderName)} · <strong>${escapeHtml(opts.projectTitle)}</strong></p>
      <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(opts.content)}</p>
      ${emailBtn("Przejdź do projektu", link)}
    `),
  );
}

export async function notifyClientDesignerListReply(opts: {
  clientEmail: string;
  listName: string;
  listPath: string;
  productName: string;
  productId: string;
  designerName: string;
  content: string;
}) {
  const link = `${APP_URL}/listy/${opts.listPath}?product=${opts.productId}`;
  await sendNotificationEmail(
    opts.clientEmail,
    `Projektant odpowiedział na liście „${opts.listName}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowa odpowiedź projektanta</h2>
      <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${escapeHtml(opts.designerName)} · ${escapeHtml(opts.productName)} · <strong>${escapeHtml(opts.listName)}</strong></p>
      <p style="margin:16px 0 0;font-size:15px;color:#374151;line-height:1.6;">${escapeHtml(opts.content)}</p>
      ${emailBtn("Przejdź do listy", link)}
    `),
  );
}

export async function sendSurveyReminderEmail({
  to,
  surveyName,
  shareLink,
}: {
  to: string;
  surveyName: string;
  shareLink: string;
}) {
  const safeName = escapeHtml(surveyName);
  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Przypomnienie: wypełnij ankietę „${safeName}"`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h2 style="margin-bottom: 8px;">Przypomnienie o ankiecie</h2>
        <p style="color: #555; margin-bottom: 24px;">
          Prosimy o wypełnienie ankiety <strong>${safeName}</strong>.
        </p>
        <a href="${shareLink}"
          style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px;
                 border-radius: 8px; text-decoration: none; font-weight: 600;">
          Wypełnij ankietę
        </a>
        <p style="margin-top: 24px; font-size: 12px; color: #bbb;">${shareLink}</p>
      </div>
    `,
  });
}

export async function notifyAdminNewUser(opts: {
  fullName: string;
  email: string;
  createdAt: Date;
}) {
  const safe = (s: string) => escapeHtml(s);
  await transporter.sendMail({
    from: FROM,
    to: "veedeck@veedeck.com",
    subject: `Nowy użytkownik: ${safe(opts.fullName)}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowe konto w veedeck</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Imię i nazwisko</td><td style="padding:6px 0;color:#111;font-weight:600;">${safe(opts.fullName)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111;">${safe(opts.email)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Data rejestracji</td><td style="padding:6px 0;color:#111;">${opts.createdAt.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" })}</td></tr>
      </table>
    `),
  }).catch((err) => console.error("[EMAIL] notifyAdminNewUser failed:", err));
}

export async function notifyAdminNewPayment(opts: {
  userEmail: string;
  userName: string | null;
  plan: string;
  interval: string;
  amountTotal: number | null;
  currency: string | null;
}) {
  const safe = (s: string) => escapeHtml(s);
  const amount =
    opts.amountTotal != null && opts.amountTotal > 0
      ? `${(opts.amountTotal / 100).toFixed(2)} ${(opts.currency ?? "").toUpperCase()}`
      : "trial / bez płatności";
  await transporter.sendMail({
    from: FROM,
    to: "veedeck@veedeck.com",
    subject: `Nowa subskrypcja: ${safe(opts.plan)} · ${safe(opts.interval)}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowa subskrypcja</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Użytkownik</td><td style="padding:6px 0;color:#111;font-weight:600;">${opts.userName ? safe(opts.userName) : "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111;">${safe(opts.userEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;color:#111;">${safe(opts.plan)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Interwał</td><td style="padding:6px 0;color:#111;">${safe(opts.interval)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Kwota</td><td style="padding:6px 0;color:#111;">${amount}</td></tr>
      </table>
    `),
  }).catch((err) => console.error("[EMAIL] notifyAdminNewPayment failed:", err));
}

export async function notifyAdminNewTicket(opts: {
  userEmail: string;
  userName: string | null;
  subject: string;
  message: string;
  category: string | null;
}) {
  const safeEmail = escapeHtml(opts.userEmail);
  const safeName = opts.userName ? escapeHtml(opts.userName) : null;
  const safeSubject = escapeHtml(opts.subject || "(brak tematu)");
  const safeMessage = escapeHtml(opts.message || "(brak treści)");
  const safeCategory = opts.category ? escapeHtml(opts.category) : null;

  await transporter.sendMail({
    from: FROM,
    to: "support@veedeck.com",
    subject: `Nowe zgłoszenie: ${safeSubject}`,
    html: emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Nowe zgłoszenie od użytkownika</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#6b7280;">
        ${safeName ? `<strong>${safeName}</strong> · ` : ""}${safeEmail}
        ${safeCategory ? ` · <span style="background:#f3f4f6;padding:2px 8px;border-radius:99px;font-size:12px;">${safeCategory}</span>` : ""}
      </p>
      <p style="margin:0 0 8px;font-size:15px;font-weight:600;color:#111;">${safeSubject}</p>
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${safeMessage}</p>
      ${emailBtn("Otwórz zgłoszenie", `${APP_URL}/admin/tickets`)}
    `),
  }).catch((err) => console.error("[EMAIL] notifyAdminNewTicket failed:", err));
}

export async function notifyDesignerSurveySubmitted(opts: {
  designerEmail: string;
  surveyName: string;
  surveyId: string;
  respondentEmail: string;
  respondentName: string | null;
}) {
  const link = `${APP_URL}/ankiety/${opts.surveyId}/odpowiedzi`;
  const who = opts.respondentName
    ? `${escapeHtml(opts.respondentName)} (${escapeHtml(opts.respondentEmail)})`
    : escapeHtml(opts.respondentEmail);
  await sendNotificationEmail(
    opts.designerEmail,
    `Nowa odpowiedź na ankietę „${opts.surveyName}"`,
    emailBase(`
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Ankieta wypełniona</h2>
      <p style="margin:0;font-size:14px;color:#6b7280;"><strong>${who}</strong> wypełnił(a) ankietę <strong>${escapeHtml(opts.surveyName)}</strong>.</p>
      ${emailBtn("Zobacz odpowiedzi", link)}
    `),
  );
}

export async function sendPaymentFailedEmail({
  to,
  locale = "pl",
}: {
  to: string;
  locale?: "pl" | "en";
}) {
  const billingUrl = `${APP_URL}/ustawienia/plan-i-rozliczenia`;
  const isPL = locale !== "en";
  await transporter.sendMail({
    from: FROM,
    to,
    subject: isPL
      ? "Nie udało się pobrać płatności za veedeck"
      : "Your veedeck payment could not be processed",
    html: isPL ? paymentFailedEmailPL(billingUrl) : paymentFailedEmailEN(billingUrl),
  });
}

export async function notifyAdminSubscriptionChanged(opts: {
  userEmail: string;
  userName: string | null;
  changeType: "plan_change" | "cancel_scheduled" | "cancel_revoked";
  oldPlan?: string;
  newPlan?: string;
  cancelAt?: Date;
}) {
  const safe = (s: string) => escapeHtml(s);
  const subjects: Record<string, string> = {
    plan_change: `Zmiana planu: ${opts.oldPlan} → ${opts.newPlan}`,
    cancel_scheduled: `Anulowanie subskrypcji: ${opts.userEmail}`,
    cancel_revoked: `Cofnięcie anulowania: ${opts.userEmail}`,
  };
  const bodies: Record<string, string> = {
    plan_change: `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Zmiana planu subskrypcji</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Użytkownik</td><td style="padding:6px 0;color:#111;font-weight:600;">${opts.userName ? safe(opts.userName) : "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111;">${safe(opts.userEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Stary plan</td><td style="padding:6px 0;color:#111;">${safe(opts.oldPlan ?? "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#111;font-weight:600;">Nowy plan</td><td style="padding:6px 0;color:#111;font-weight:600;">${safe(opts.newPlan ?? "—")}</td></tr>
      </table>`,
    cancel_scheduled: `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Subskrypcja zaplanowana do anulowania</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Użytkownik</td><td style="padding:6px 0;color:#111;font-weight:600;">${opts.userName ? safe(opts.userName) : "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111;">${safe(opts.userEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;color:#111;">${safe(opts.newPlan ?? "—")}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Koniec dostępu</td><td style="padding:6px 0;color:#D6473C;font-weight:600;">${opts.cancelAt?.toLocaleString("pl-PL", { timeZone: "Europe/Warsaw" }) ?? "—"}</td></tr>
      </table>`,
    cancel_revoked: `
      <h2 style="margin:0 0 8px;font-size:18px;color:#111;">Cofnięcie anulowania subskrypcji</h2>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
        <tr><td style="padding:6px 0;color:#6b7280;width:140px;">Użytkownik</td><td style="padding:6px 0;color:#111;font-weight:600;">${opts.userName ? safe(opts.userName) : "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Email</td><td style="padding:6px 0;color:#111;">${safe(opts.userEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;">Plan</td><td style="padding:6px 0;color:#111;">${safe(opts.newPlan ?? "—")}</td></tr>
      </table>`,
  };
  await transporter.sendMail({
    from: FROM,
    to: "veedeck@veedeck.com",
    subject: subjects[opts.changeType],
    html: emailBase(bodies[opts.changeType]),
  }).catch((err) => console.error("[EMAIL] notifyAdminSubscriptionChanged failed:", err));
}
