import nodemailer from "nodemailer";
import { escapeHtml } from "@/lib/validation";
import { activationEmailPL, activationEmailEN, resetEmailPL, resetEmailEN } from "@/lib/email-templates";

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

export async function sendClientInvitationEmail({
  to,
  designerName,
  token,
}: {
  to: string;
  designerName: string;
  token: string;
}) {
  const link = `${APP_URL}/client-invite/${token}`;
  const safeDesignerName = escapeHtml(designerName);

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Zaproszenie od projektanta — ${safeDesignerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h2 style="margin-bottom: 8px;">Zaproszenie do projektu</h2>
        <p style="color: #555; margin-bottom: 24px;">
          <strong>${safeDesignerName}</strong> zaprasza Cię do swojego panelu klienta.
          Kliknij poniższy przycisk, aby założyć konto i zobaczyć swój projekt.
        </p>
        <a href="${link}"
          style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px;
                 border-radius: 8px; text-decoration: none; font-weight: 600;">
          Załóż konto klienta
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">
          Link wygaśnie za 7 dni. Jeśli nie spodziewałeś się tego zaproszenia, zignoruj tę wiadomość.
        </p>
        <p style="margin-top: 4px; font-size: 12px; color: #bbb;">${link}</p>
      </div>
    `,
  });
}

export async function sendInvitationEmail({
  to,
  designerName,
  token,
}: {
  to: string;
  designerName: string;
  token: string;
}) {
  const link = `${APP_URL}/invite/${token}`;
  const safeDesignerName = escapeHtml(designerName);

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Zaproszenie do panelu projektanta — ${safeDesignerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h2 style="margin-bottom: 8px;">Zaproszenie do współpracy</h2>
        <p style="color: #555; margin-bottom: 24px;">
          <strong>${safeDesignerName}</strong> zaprasza Cię do swojego panelu projektanta.
          Kliknij poniższy przycisk, aby ustawić hasło i rozpocząć współpracę.
        </p>
        <a href="${link}"
          style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 24px;
                 border-radius: 8px; text-decoration: none; font-weight: 600;">
          Przyjmij zaproszenie
        </a>
        <p style="margin-top: 24px; font-size: 13px; color: #888;">
          Link wygaśnie za 7 dni. Jeśli nie spodziewałeś się tego zaproszenia, zignoruj tę wiadomość.
        </p>
        <p style="margin-top: 4px; font-size: 12px; color: #bbb;">${link}</p>
      </div>
    `,
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
          <span style="color:#fff;font-size:18px;font-weight:700;letter-spacing:-.3px;">veedeck</span>
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
