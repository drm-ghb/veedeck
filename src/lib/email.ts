import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === "true", // true dla portu 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.SMTP_FROM_NAME ?? "Widek"}" <${process.env.SMTP_USER}>`;
const APP_URL = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";

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

  await transporter.sendMail({
    from: FROM,
    to,
    subject: `Zaproszenie do panelu projektanta — ${designerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #111;">
        <h2 style="margin-bottom: 8px;">Zaproszenie do współpracy</h2>
        <p style="color: #555; margin-bottom: 24px;">
          <strong>${designerName}</strong> zaprasza Cię do swojego panelu projektanta.
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
