const ICON_URL = "https://veedeck.com/veedeck_ikona_vsg.svg";
const PRIVACY_URL_PL = "https://veedeck.com/polityka-prywatnosci.html";
const PRIVACY_URL_EN = "https://veedeck.com/privacy-policy.html";
const CONTACT_EMAIL = "contact@veedeck.com";

export function resetEmailPL(resetUrl: string): string {
  const safe = resetUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — reset hasła</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #FBFAF7; }
  a { color: #4F46E5; }
  @media (max-width: 620px) {
    .vd-pad { padding: 40px 26px !important; }
    .vd-h1 { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FBFAF7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBFAF7;font-size:1px;line-height:1px;">Zresetuj hasło do veedeck — link jest ważny przez 60 minut.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;">
    <tr>
      <td align="center" style="padding:8px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <tr>
            <td class="vd-pad" style="padding:56px 40px 48px;">

              <!-- Brand -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;"><img src="${ICON_URL}" width="26" height="26" alt="veedeck" style="display:block;width:26px;height:26px;"></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:18px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>

              <div style="margin:44px 0 0;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4F46E5;">Reset hasła</div>

              <h1 class="vd-h1" style="margin:14px 0 0;font-family:'Inter',Arial,sans-serif;font-size:38px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:#24252B;">
                Ustaw nowe hasło.
              </h1>

              <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#565A69;max-width:440px;">
                Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w&nbsp;veedeck. Kliknij przycisk poniżej, aby ustawić nowe hasło.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#4F46E5;">
                    <a href="${safe}" style="display:inline-block;padding:15px 38px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">Resetuj hasło</a>
                  </td>
                </tr>
              </table>

              <!-- Info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:44px 0 0;">
                <tr>
                  <td style="padding:0 0 14px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;text-align:center;line-height:24px;">⏱</div>
                  </td>
                  <td style="padding:0 0 14px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Link jest ważny przez <b style="color:#24252B;font-weight:600;">60&nbsp;minut</b> i można go użyć tylko raz.</td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;text-align:center;line-height:24px;">🔒</div>
                  </td>
                  <td style="vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Twoje obecne hasło pozostaje aktywne, dopóki nie ustawisz nowego.</td>
                </tr>
              </table>

              <div style="border-top:1px solid #EAE7DF;margin:40px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#98958C;">
                Przycisk nie działa? Wklej ten link do przeglądarki:<br>
                <a href="${safe}" style="color:#4F46E5;text-decoration:underline;word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#B0ADA3;">
                Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — Twoje konto jest bezpieczne, a hasło pozostaje bez zmian.
              </p>

              <div style="border-top:1px solid #EAE7DF;margin:36px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#B0ADA3;">
                veedeck — Visualize, Design, Deliver &nbsp;·&nbsp;
                <a href="${PRIVACY_URL_PL}" style="color:#98958C;text-decoration:none;">Prywatność</a> &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#98958C;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function resetEmailEN(resetUrl: string): string {
  const safe = resetUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — reset your password</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #FBFAF7; }
  a { color: #4F46E5; }
  @media (max-width: 620px) {
    .vd-pad { padding: 40px 26px !important; }
    .vd-h1 { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FBFAF7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBFAF7;font-size:1px;line-height:1px;">Reset your veedeck password — this link is valid for 60 minutes.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;">
    <tr>
      <td align="center" style="padding:8px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">
          <tr>
            <td class="vd-pad" style="padding:56px 40px 48px;">

              <!-- Brand -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;"><img src="${ICON_URL}" width="26" height="26" alt="veedeck" style="display:block;width:26px;height:26px;"></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:18px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>

              <div style="margin:44px 0 0;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4F46E5;">Password reset</div>

              <h1 class="vd-h1" style="margin:14px 0 0;font-family:'Inter',Arial,sans-serif;font-size:38px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:#24252B;">
                Set a new password.
              </h1>

              <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#565A69;max-width:440px;">
                We received a request to reset the password for your veedeck account. Click the button below to set a new password.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#4F46E5;">
                    <a href="${safe}" style="display:inline-block;padding:15px 38px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">Reset password</a>
                  </td>
                </tr>
              </table>

              <!-- Info -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:44px 0 0;">
                <tr>
                  <td style="padding:0 0 14px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;text-align:center;line-height:24px;">⏱</div>
                  </td>
                  <td style="padding:0 0 14px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">This link is valid for <b style="color:#24252B;font-weight:600;">60&nbsp;minutes</b> and can be used only once.</td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;text-align:center;line-height:24px;">🔒</div>
                  </td>
                  <td style="vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Your current password stays active until you set a new one.</td>
                </tr>
              </table>

              <div style="border-top:1px solid #EAE7DF;margin:40px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#98958C;">
                Button not working? Paste this link into your browser:<br>
                <a href="${safe}" style="color:#4F46E5;text-decoration:underline;word-break:break-all;">${resetUrl}</a>
              </p>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#B0ADA3;">
                If you didn't request a password change, you can safely ignore this email — your account is secure and your password stays unchanged.
              </p>

              <div style="border-top:1px solid #EAE7DF;margin:36px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#B0ADA3;">
                veedeck — Visualize, Design, Deliver &nbsp;·&nbsp;
                <a href="${PRIVACY_URL_EN}" style="color:#98958C;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#98958C;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function activationEmailPL(activationUrl: string): string {
  const safe = activationUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — aktywuj konto</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #FBFAF7; }
  a { color: #4F46E5; }
  @media (max-width: 620px) {
    .vd-pad { padding: 40px 26px !important; }
    .vd-h1 { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FBFAF7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBFAF7;font-size:1px;line-height:1px;">Aktywuj konto veedeck — zostało kilka sekund.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;">
    <tr>
      <td align="center" style="padding:8px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

          <tr>
            <td class="vd-pad" style="padding:56px 40px 48px;">

              <!-- Brand -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;"><img src="${ICON_URL}" width="26" height="26" alt="veedeck" style="display:block;width:26px;height:26px;"></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:18px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>

              <!-- Eyebrow rule -->
              <div style="margin:44px 0 0;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4F46E5;">Aktywacja konta</div>

              <h1 class="vd-h1" style="margin:14px 0 0;font-family:'Inter',Arial,sans-serif;font-size:38px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:#24252B;">
                Dziękujemy za&nbsp;rejestrację.
              </h1>

              <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#565A69;max-width:440px;">
                Cieszymy się, że dołączasz do&nbsp;veedeck. Aby dokończyć zakładanie konta, potwierdź swój adres e-mail — jednym kliknięciem.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#4F46E5;">
                    <a href="${safe}" style="display:inline-block;padding:15px 38px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">Aktywuj konto</a>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:48px 0 0;">
                <tr>
                  <td style="padding:0 0 16px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">1</div>
                  </td>
                  <td style="padding:0 0 16px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Potwierdź adres e-mail przyciskiem powyżej.</td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">2</div>
                  </td>
                  <td style="padding:0 0 16px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Skonfiguruj profil pracowni w&nbsp;panelu.</td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">3</div>
                  </td>
                  <td style="vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Dodaj pierwszy projekt — masz 14&nbsp;dni pełnego dostępu.</td>
                </tr>
              </table>

              <div style="border-top:1px solid #EAE7DF;margin:40px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#98958C;">
                Przycisk nie działa? Wklej ten link do przeglądarki:<br>
                <a href="${safe}" style="color:#4F46E5;text-decoration:underline;word-break:break-all;">${activationUrl}</a>
              </p>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#B0ADA3;">
                Jeśli to nie Ty zakładasz konto w&nbsp;veedeck, zignoruj tę wiadomość.
              </p>

              <div style="border-top:1px solid #EAE7DF;margin:36px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#B0ADA3;">
                veedeck — Visualize, Design, Deliver &nbsp;·&nbsp;
                <a href="${PRIVACY_URL_PL}" style="color:#98958C;text-decoration:none;">Prywatność</a> &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#98958C;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function activationEmailEN(activationUrl: string): string {
  const safe = activationUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — activate your account</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #FBFAF7; }
  a { color: #4F46E5; }
  @media (max-width: 620px) {
    .vd-pad { padding: 40px 26px !important; }
    .vd-h1 { font-size: 30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#FBFAF7;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#FBFAF7;font-size:1px;line-height:1px;">Activate your veedeck account — it only takes a few seconds.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FBFAF7;">
    <tr>
      <td align="center" style="padding:8px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">

          <tr>
            <td class="vd-pad" style="padding:56px 40px 48px;">

              <!-- Brand -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:9px;"><img src="${ICON_URL}" width="26" height="26" alt="veedeck" style="display:block;width:26px;height:26px;"></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:18px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>

              <!-- Eyebrow rule -->
              <div style="margin:44px 0 0;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#4F46E5;">Account activation</div>

              <h1 class="vd-h1" style="margin:14px 0 0;font-family:'Inter',Arial,sans-serif;font-size:38px;line-height:1.12;font-weight:700;letter-spacing:-0.03em;color:#24252B;">
                Thanks for signing up.
              </h1>

              <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#565A69;max-width:440px;">
                We're glad you're joining veedeck. To finish setting up your account, confirm your email address — with a single click.
              </p>

              <!-- CTA -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                <tr>
                  <td style="border-radius:999px;background:#4F46E5;">
                    <a href="${safe}" style="display:inline-block;padding:15px 38px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:999px;">Activate account</a>
                  </td>
                </tr>
              </table>

              <!-- Steps -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:48px 0 0;">
                <tr>
                  <td style="padding:0 0 16px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">1</div>
                  </td>
                  <td style="padding:0 0 16px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Confirm your email with the button above.</td>
                </tr>
                <tr>
                  <td style="padding:0 0 16px;vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">2</div>
                  </td>
                  <td style="padding:0 0 16px;vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Set up your studio profile in the dashboard.</td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:34px;">
                    <div style="width:26px;height:26px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:700;text-align:center;line-height:24px;">3</div>
                  </td>
                  <td style="vertical-align:top;font-size:15px;line-height:1.5;color:#565A69;">Add your first project — you have 14&nbsp;days of full access.</td>
                </tr>
              </table>

              <div style="border-top:1px solid #EAE7DF;margin:40px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#98958C;">
                Button not working? Paste this link into your browser:<br>
                <a href="${safe}" style="color:#4F46E5;text-decoration:underline;word-break:break-all;">${activationUrl}</a>
              </p>
              <p style="margin:18px 0 0;font-size:13px;line-height:1.6;color:#B0ADA3;">
                If you didn't create a veedeck account, you can safely ignore this email.
              </p>

              <div style="border-top:1px solid #EAE7DF;margin:36px 0 0;"></div>

              <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#B0ADA3;">
                veedeck — Visualize, Design, Deliver &nbsp;·&nbsp;
                <a href="${PRIVACY_URL_EN}" style="color:#98958C;text-decoration:none;">Privacy</a> &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#98958C;text-decoration:none;">${CONTACT_EMAIL}</a>
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
