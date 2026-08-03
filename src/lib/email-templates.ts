const ICON_URL = "https://veedeck.com/logo.png";
const PRIVACY_URL_PL = "https://veedeck.com/polityka-prywatnosci.html";
const PRIVACY_URL_EN = "https://veedeck.com/privacy-policy.html";
const COOKIES_URL_PL = "https://veedeck.com/polityka-cookies.html";
const COOKIES_URL_EN = "https://veedeck.com/polityka-cookies.html";
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
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">Zresetuj hasło do veedeck — link jest ważny przez 60 minut.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Reset hasła</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Ustaw nowe hasło
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta w&nbsp;veedeck. Kliknij przycisk poniżej, aby ustawić nowe hasło.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Resetuj hasło</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">⏱</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Link jest ważny przez <b style="color:#24252B;font-weight:600;">60&nbsp;minut</b> i można go użyć tylko raz.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">🔒</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Twoje obecne hasło pozostaje aktywne, dopóki nie ustawisz nowego.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${resetUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli to nie Ty prosiłeś o zmianę hasła, zignoruj tę wiadomość — Twoje konto jest bezpieczne, a hasło pozostaje bez zmian.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">Reset your veedeck password — this link is valid for 60 minutes.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Password reset</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Set a new password
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      We received a request to reset the password for your veedeck account. Click the button below to set a new password.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Reset password</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">⏱</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">This link is valid for <b style="color:#24252B;font-weight:600;">60&nbsp;minutes</b> and can be used only once.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">🔒</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Your current password stays active until you set a new one.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Button not working? Paste this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${resetUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">If you didn't request a password change, you can safely ignore this email — your account is secure and your password stays unchanged.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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
  body { margin: 0; padding: 0; background: #F5F5F5; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F5F5;font-size:1px;line-height:1px;">Aktywuj konto veedeck — zostało kilka sekund.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                        <td style="vertical-align:middle;line-height:1;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                      </tr>
                    </table>

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Aktywacja konta</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Dziękujemy za&nbsp;rejestrację
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Cieszymy się, że dołączasz do&nbsp;veedeck. Aby dokończyć zakładanie konta, potwierdź swój adres e-mail — jednym kliknięciem.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Aktywuj konto</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Steps -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 12px;vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">1</div>
                              </td>
                              <td style="padding:0 0 12px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Potwierdź adres e-mail przyciskiem powyżej.</td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 12px;vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">2</div>
                              </td>
                              <td style="padding:0 0 12px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Skonfiguruj profil pracowni w&nbsp;panelu.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">3</div>
                              </td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Dodaj pierwszy projekt — masz 14&nbsp;dni pełnego dostępu.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${activationUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli to nie Ty zakładasz konto w&nbsp;veedeck, zignoruj tę wiadomość.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialMidpointEmailPL(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - Twój okres próbny kończy się za 15 dni</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Zostało 15 dni okresu próbnego veedeck. Po jego zakończeniu konto przejdzie w tryb tylko do odczytu.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg>
                  </td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">
                    veedeck
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
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <!-- Countdown badge -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">15</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">
                            Okres próbny
                          </div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">
                            dni do końca
                          </div>
                        </td>
                      </tr>
                    </table>

                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Twój okres próbny kończy się za&nbsp;15&nbsp;dni
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Korzystasz z&nbsp;pełnego dostępu do&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Zostało jeszcze 15&nbsp;dni - to dobry moment, żeby wybrać plan i&nbsp;nie stracić ciągłości pracy nad projektami.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                            Wybierz plan
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Co się stanie po zakończeniu -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">
                            Co się stanie po zakończeniu?
                          </div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">
                            Konto przejdzie w&nbsp;tryb tylko do odczytu
                          </div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">
                            Nadal będziesz mógł przeglądać wszystkie swoje projekty i&nbsp;wizualizacje, ale nie będziesz mógł wprowadzać w&nbsp;nich żadnych zmian - dodawanie, edycja i&nbsp;eksport zostaną zablokowane do&nbsp;czasu wyboru planu.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">
                      Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:
                    </p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
                      <a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a>
                    </p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                      Masz pytania dotyczące planów lub przejścia z&nbsp;wersji próbnej? Odpisz na&nbsp;tę wiadomość - chętnie pomożemy.
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
                veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.
              </p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialMidpointEmailEN(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - your trial ends in 15 days</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Your veedeck trial has 15 days left. After it ends, your account switches to read-only mode.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg>
                  </td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">
                    veedeck
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
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <!-- Countdown badge -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">15</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">
                            Trial period
                          </div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">
                            days left
                          </div>
                        </td>
                      </tr>
                    </table>

                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Your trial ends in&nbsp;15&nbsp;days
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      You're enjoying full access to&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. You have 15&nbsp;days left - a good time to pick a plan and keep your projects running without interruption.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                            Choose a plan
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- What happens when it ends -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">
                            What happens when it ends?
                          </div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">
                            Your account switches to&nbsp;read-only mode
                          </div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">
                            You'll still be able to view all your projects and renderings, but you won't be able to make any changes - adding, editing, and exporting will be locked until you choose a plan.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">
                      If the button doesn't work, copy this link into your browser:
                    </p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;">
                      <a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a>
                    </p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                      Have questions about plans or moving on from the trial? Reply to&nbsp;this email - we're happy to help.
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
                veedeck - Visualize, Design, Deliver. The platform for interior designers.
              </p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialDay7EmailPL(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - Został Ci tylko tydzień!</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Zostało 7 dni okresu próbnego veedeck. Po jego zakończeniu konto przejdzie w tryb tylko do odczytu.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">7</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Okres próbny</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">dni do końca</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Został Ci tylko tydzień z&nbsp;veedeck!
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Korzystasz z&nbsp;pełnego dostępu do&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Zostało już tylko 7&nbsp;dni - wybierz plan teraz, żeby nie stracić ciągłości pracy nad projektami.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Wybierz plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Co się stanie po zakończeniu?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">Konto przejdzie w&nbsp;tryb tylko do odczytu</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">Nadal będziesz mógł przeglądać wszystkie swoje projekty i&nbsp;wizualizacje, ale nie będziesz mógł wprowadzać w&nbsp;nich żadnych zmian - dodawanie, edycja i&nbsp;eksport zostaną zablokowane do&nbsp;czasu wyboru planu.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Masz pytania dotyczące planów lub przejścia z&nbsp;wersji próbnej? Odpisz na&nbsp;tę wiadomość - chętnie pomożemy.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialDay7EmailEN(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - only one week left!</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Your veedeck trial has 7 days left. After it ends, your account switches to read-only mode.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">7</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Trial period</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">days left</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Only one week left with&nbsp;veedeck!
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      You're enjoying full access to&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. You only have 7&nbsp;days left - pick a plan now to keep your projects running without interruption.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Choose a plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">What happens when it ends?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">Your account switches to&nbsp;read-only mode</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">You'll still be able to view all your projects and renderings, but you won't be able to make any changes - adding, editing, and exporting will be locked until you choose a plan.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">If the button doesn't work, copy this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Have questions about plans or moving on from the trial? Reply to&nbsp;this email - we're happy to help.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialDay3EmailPL(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - zostały tylko 3 dni!</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Zostały 3 dni okresu próbnego veedeck. Po jego zakończeniu konto przejdzie w tryb tylko do odczytu.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">3</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Okres próbny</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">dni do końca</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Zostały Ci tylko 3&nbsp;dni z&nbsp;veedeck!
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Korzystasz z&nbsp;pełnego dostępu do&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Zostały już tylko 3&nbsp;dni - wybierz plan teraz, żeby nie stracić ciągłości pracy nad projektami.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Wybierz plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Co się stanie po zakończeniu?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">Konto przejdzie w&nbsp;tryb tylko do odczytu</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">Nadal będziesz mógł przeglądać wszystkie swoje projekty i&nbsp;wizualizacje, ale nie będziesz mógł wprowadzać w&nbsp;nich żadnych zmian - dodawanie, edycja i&nbsp;eksport zostaną zablokowane do&nbsp;czasu wyboru planu.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Masz pytania dotyczące planów lub przejścia z&nbsp;wersji próbnej? Odpisz na&nbsp;tę wiadomość - chętnie pomożemy.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialDay3EmailEN(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - only 3 days left!</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
    .vd-badge-num { font-size: 34px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Your veedeck trial has 3 days left. After it ends, your account switches to read-only mode.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#EEF2FF;text-align:center;line-height:64px;">
                            <span class="vd-badge-num" style="font-family:'Inter',Arial,sans-serif;font-size:26px;font-weight:700;color:#4F46E5;">3</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Trial period</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">days left</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Only 3&nbsp;days left with&nbsp;veedeck!
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      You're enjoying full access to&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. You only have 3&nbsp;days left - pick a plan now to keep your projects running without interruption.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Choose a plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">What happens when it ends?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">Your account switches to&nbsp;read-only mode</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">You'll still be able to view all your projects and renderings, but you won't be able to make any changes - adding, editing, and exporting will be locked until you choose a plan.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">If the button doesn't work, copy this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Have questions about plans or moving on from the trial? Reply to&nbsp;this email - we're happy to help.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialEndedEmailPL(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - Twój okres próbny się zakończył</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Twój okres próbny veedeck się zakończył. Konto jest teraz w trybie tylko do odczytu - wybierz plan, aby wrócić do edycji.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#F2F3F7;text-align:center;line-height:64px;">
                            <span style="font-size:26px;">🔒</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Okres próbny zakończony</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">Konto: tylko do odczytu</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Twój okres próbny się&nbsp;zakończył
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Dziękujemy, że wypróbowałeś/aś&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Twoje konto przeszło teraz w&nbsp;tryb tylko do odczytu - wybierz plan, aby odzyskać pełny dostęp i&nbsp;wrócić do&nbsp;pracy nad projektami.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Wybierz plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Co to oznacza?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">Możesz przeglądać, ale nie edytować</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">Wszystkie Twoje projekty i&nbsp;wizualizacje są bezpieczne i&nbsp;dostępne do&nbsp;podglądu. Dodawanie, edycja i&nbsp;eksport są zablokowane, dopóki nie&nbsp;wybierzesz planu.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Jeśli przycisk nie działa, skopiuj ten adres do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Masz pytania dotyczące planów? Odpisz na&nbsp;tę wiadomość - chętnie pomożemy.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function trialEndedEmailEN(upgradeUrl: string): string {
  const safe = upgradeUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck - your trial has ended</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">
    Your veedeck trial has ended. Your account is now in read-only mode - choose a plan to get back to editing.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="vertical-align:middle;padding-right:14px;">
                          <div style="width:64px;height:64px;border-radius:16px;background:#F2F3F7;text-align:center;line-height:64px;">
                            <span style="font-size:26px;">🔒</span>
                          </div>
                        </td>
                        <td style="vertical-align:middle;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Trial ended</div>
                          <div style="margin-top:2px;font-family:'Inter',Arial,sans-serif;font-size:15px;font-weight:700;color:#24252B;">Account: read-only</div>
                        </td>
                      </tr>
                    </table>
                    <h1 class="vd-h1" style="margin:26px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Your trial has&nbsp;ended
                    </h1>
                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Thanks for trying&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Your account has now switched to&nbsp;read-only mode - choose a plan to regain full access and get back to&nbsp;your projects.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Choose a plan</a>
                        </td>
                      </tr>
                    </table>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <div style="font-family:'Inter',Arial,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">What does this mean?</div>
                          <div style="margin-top:8px;font-family:'Inter',Arial,sans-serif;font-size:17px;font-weight:700;letter-spacing:-0.015em;color:#24252B;">You can view, but not edit</div>
                          <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#565A69;">All your projects and renderings are safe and available to&nbsp;view. Adding, editing, and exporting are locked until you&nbsp;choose a plan.</p>
                        </td>
                      </tr>
                    </table>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">If the button doesn't work, copy this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${upgradeUrl}</a></p>
                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>
                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Have questions about plans? Reply to&nbsp;this email - we're happy to help.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function clientInvitationEmailPL({ inviteUrl, designerName }: { inviteUrl: string; designerName: string }): string {
  const safe = inviteUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — zaproszenie do projektu</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">Masz zaproszenie do projektu w veedeck. Kliknij, aby założyć konto i zobaczyć swój projekt.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Zaproszenie do projektu</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Masz dostęp do swojego projektu
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      <b style="color:#24252B;">${designerName}</b> zaprasza Cię do panelu klienta w&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Kliknij przycisk poniżej, aby założyć konto i&nbsp;zobaczyć swój projekt.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Załóż konto klienta</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🔑</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Link jest ważny przez <b style="color:#24252B;font-weight:600;">7&nbsp;dni</b>.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">🏠</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Po założeniu konta zobaczysz rendery, listy produktów i&nbsp;pliki udostępnione przez projektanta.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${inviteUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli nie spodziewałeś(aś) się tego zaproszenia, zignoruj tę wiadomość.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function clientInvitationEmailEN({ inviteUrl, designerName }: { inviteUrl: string; designerName: string }): string {
  const safe = inviteUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — project invitation</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">You have been invited to a project on veedeck. Click to create your account and view your project.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Project invitation</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      You have access to your project
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      <b style="color:#24252B;">${designerName}</b> is inviting you to the client panel in&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Click the button below to create your account and view your project.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Create client account</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🔑</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">This link is valid for <b style="color:#24252B;font-weight:600;">7&nbsp;days</b>.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">🏠</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Once your account is set up, you'll see renders, product lists, and files shared by your designer.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Button not working? Paste this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${inviteUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">If you weren't expecting this invitation, you can safely ignore this email.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function teamInvitationEmailPL({ inviteUrl, designerName }: { inviteUrl: string; designerName: string }): string {
  const safe = inviteUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — zaproszenie do zespołu</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">Masz zaproszenie do panelu projektanta veedeck. Kliknij, aby ustawić hasło i zacząć.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Zaproszenie do zespołu</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Dołącz do panelu projektanta
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      <b style="color:#24252B;">${designerName}</b> zaprasza Cię do współpracy w&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Kliknij przycisk poniżej, aby ustawić hasło i&nbsp;zacząć pracować razem.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Przyjmij zaproszenie</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🔑</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Link jest ważny przez <b style="color:#24252B;font-weight:600;">7&nbsp;dni</b>.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">💡</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Po kliknięciu ustawisz hasło i&nbsp;uzyskasz dostęp do&nbsp;panelu projektanta.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${inviteUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli nie spodziewałeś(aś) się tego zaproszenia, zignoruj tę wiadomość.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function teamInvitationEmailEN({ inviteUrl, designerName }: { inviteUrl: string; designerName: string }): string {
  const safe = inviteUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — team invitation</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">You have been invited to a designer's panel on veedeck. Click to set your password and get started.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Team invitation</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Join a designer's panel
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      <b style="color:#24252B;">${designerName}</b> is inviting you to collaborate in&nbsp;<span style="font-family:'Nunito',Arial,sans-serif;font-weight:300;letter-spacing:-0.05em;">veedeck</span>. Click the button below to set your password and start working together.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Accept invitation</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🔑</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">This link is valid for <b style="color:#24252B;font-weight:600;">7&nbsp;days</b>.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">💡</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">After clicking, you'll set your password and get access to the designer's panel.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Button not working? Paste this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${inviteUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">If you weren't expecting this invitation, you can safely ignore this email.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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
  body { margin: 0; padding: 0; background: #D9D6FF; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#D9D6FF;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#D9D6FF;font-size:1px;line-height:1px;">Activate your veedeck account — it only takes a few seconds.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Brand -->
          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Account activation</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Thanks for signing up
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      We're glad you're joining veedeck. To finish setting up your account, confirm your email address — with a single click.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Activate account</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Steps -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 12px;vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">1</div>
                              </td>
                              <td style="padding:0 0 12px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Confirm your email address with the button above.</td>
                            </tr>
                            <tr>
                              <td style="padding:0 0 12px;vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">2</div>
                              </td>
                              <td style="padding:0 0 12px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Set up your studio profile in the dashboard.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;">
                                <div style="width:24px;height:24px;border-radius:999px;border:1.5px solid #4F46E5;color:#4F46E5;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;text-align:center;line-height:22px;">3</div>
                              </td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Add your first project — you have 14&nbsp;days of full access.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Button not working? Paste this link into your browser:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${activationUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">If you didn't create a veedeck account, you can safely ignore this email.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function paymentFailedEmailPL(billingUrl: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Nie udało się pobrać płatności</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 24px 24px;text-align:center;background-color:#FFE9E9;">
              <p style="margin:0 0 12px;font-size:32px;">⚠️</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1D23;line-height:1.3;">Nie udało się pobrać płatności</h1>
              <p style="margin:10px 0 0;font-size:15px;color:#6B7280;line-height:1.5;">Wystąpił problem z Twoją kartą płatniczą.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 8px;">

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Próbowaliśmy pobrać płatność za Twoją subskrypcję veedeck, ale transakcja nie powiodła się.</p>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF5F5;border:1px solid #FCA5A5;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#B91C1C;text-transform:uppercase;letter-spacing:0.5px;">Co oznacza ta wiadomość?</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Stripe automatycznie ponowi próbę pobrania płatności w ciągu kilku dni. Jeśli kolejne próby również się nie powiodą, Twój dostęp do veedeck może zostać zawieszony. Sprawdź dane swojej karty i upewnij się, że masz wystarczające środki.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td align="center">
                    <a href="${billingUrl}" style="display:inline-block;background-color:#EF4444;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;">Zaktualizuj dane płatności</a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9CA3AF;text-align:center;">Jeśli uważasz, że to pomyłka, skontaktuj się z nami: <a href="mailto:${CONTACT_EMAIL}" style="color:#6B7280;text-decoration:none;">${CONTACT_EMAIL}</a></p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck — platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function paymentFailedEmailEN(billingUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment failed</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F6F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F6F9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Header -->
          <tr>
            <td style="padding:32px 24px 24px;text-align:center;background-color:#FFE9E9;">
              <p style="margin:0 0 12px;font-size:32px;">⚠️</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#1A1D23;line-height:1.3;">Your payment could not be processed</h1>
              <p style="margin:10px 0 0;font-size:15px;color:#6B7280;line-height:1.5;">There was a problem with your payment method.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px 8px;">

              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">We attempted to charge your veedeck subscription but the transaction failed.</p>

              <!-- Info box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#FFF5F5;border:1px solid #FCA5A5;border-radius:10px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#B91C1C;text-transform:uppercase;letter-spacing:0.5px;">What does this mean?</p>
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#6B7280;">Stripe will automatically retry the payment over the next few days. If all retries fail, your access to veedeck may be suspended. Please check your card details and make sure you have sufficient funds.</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
                <tr>
                  <td align="center">
                    <a href="${billingUrl}" style="display:inline-block;background-color:#EF4444;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:10px;">Update payment details</a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9CA3AF;text-align:center;">If you think this is a mistake, contact us: <a href="mailto:${CONTACT_EMAIL}" style="color:#6B7280;text-decoration:none;">${CONTACT_EMAIL}</a></p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_EN}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

// ─── Access Link (client / contractor) ──────────────────────────────────────

export function accessLinkEmailPL({ link, personName, designerName }: { link: string; personName: string; designerName: string }): string {
  const safe = link.replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>veedeck — dostęp do panelu</title><style>body{margin:0;padding:0;background:#F5F5F5;}a{color:#4F46E5;}a:hover{color:#4338CA;}@media(max-width:620px){.vd-card-pad{padding:32px 24px!important;}.vd-outer-pad{padding:24px 12px!important;}.vd-h1{font-size:26px!important;}}</style></head><body style="margin:0;padding:0;background:#F5F5F5;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F5F5;font-size:1px;line-height:1px;">${designerName} udostępnił(a) Ci panel projektu w veedeck. Kliknij, aby go otworzyć.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;"><tr><td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="vd-card-pad" style="padding:44px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr><td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td><td style="vertical-align:middle;line-height:1;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td></tr></table><div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Panel projektu</div><h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">Cześć, ${personName}.</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;"><b style="color:#24252B;">${designerName}</b> udostępnił(a) Ci panel projektu w&nbsp;veedeck.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;"><tr><td style="border-radius:12px;background:#4F46E5;"><a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Otwórz panel projektu</a></td></tr></table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;"><tr><td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🔗</td><td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Ten link jest <b style="color:#24252B;">stały i nie wygaśnie</b> — możesz z niego korzystać zawsze, gdy chcesz zalogować się do panelu.</td></tr><tr><td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">🔑</td><td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Wolisz logować się hasłem? Ustaw je w panelu w ustawieniach konta, a następnie loguj się na <a href="https://veedeck.com/login" style="color:#4F46E5;text-decoration:underline;">veedeck.com/login</a>.</td></tr></table></td></tr></table><div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div><p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p><p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${link}</a></p><div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div><p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli nie spodziewałeś(aś) się tej wiadomości, zignoruj ją.</p></td></tr></table></td></tr></table><tr><td style="padding:26px 24px 8px;text-align:center;"><p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p><p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;"><a href="https://veedeck.com/polityka-prywatnosci.html" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>&nbsp;·&nbsp;<a href="https://veedeck.com/polityka-cookies.html" style="color:#8A8D9A;text-decoration:none;">Cookies</a>&nbsp;·&nbsp;<a href="mailto:contact@veedeck.com" style="color:#8A8D9A;text-decoration:none;">contact@veedeck.com</a></p></td></tr></table></td></tr></table></body></html>`;
}

export function accessLinkEmailEN({ link, personName, designerName }: { link: string; personName: string; designerName: string }): string {
  const safe = link.replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only"><title>veedeck — project panel</title><style>body{margin:0;padding:0;background:#F5F5F5;}a{color:#4F46E5;}a:hover{color:#4338CA;}@media(max-width:620px){.vd-card-pad{padding:32px 24px!important;}.vd-outer-pad{padding:24px 12px!important;}.vd-h1{font-size:26px!important;}}</style></head><body style="margin:0;padding:0;background:#F5F5F5;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F5F5;font-size:1px;line-height:1px;">${designerName} has shared a project panel with you on veedeck. Click to open it.</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;"><tr><td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="vd-card-pad" style="padding:44px 48px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;"><tr><td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td><td style="vertical-align:middle;line-height:1;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td></tr></table><div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Project panel</div><h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">Hi, ${personName}.</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;"><b style="color:#24252B;">${designerName}</b> has shared a project panel with you on&nbsp;veedeck.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;"><tr><td style="border-radius:12px;background:#4F46E5;"><a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Open project panel</a></td></tr></table><p style="margin:28px 0 0;font-size:14px;line-height:1.6;color:#8A8D9A;">Prefer a password? You can set one in the panel settings, then log in at <a href="https://veedeck.com/login" style="color:#4F46E5;text-decoration:underline;">veedeck.com/login</a>.</p><div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div><p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Button not working? Paste this link into your browser:</p><p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${link}</a></p><div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div><p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">If you didn't expect this email, you can safely ignore it.</p></td></tr></table></td></tr></table><tr><td style="padding:26px 24px 8px;text-align:center;"><p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. The platform for interior designers.</p><p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;"><a href="https://veedeck.com/privacy-policy.html" style="color:#8A8D9A;text-decoration:none;">Privacy Policy</a>&nbsp;·&nbsp;<a href="https://veedeck.com/polityka-cookies.html" style="color:#8A8D9A;text-decoration:none;">Cookies</a>&nbsp;·&nbsp;<a href="mailto:contact@veedeck.com" style="color:#8A8D9A;text-decoration:none;">contact@veedeck.com</a></p></td></tr></table></td></tr></table></body></html>`;
}

export function reminderEmailPL({ link, personName, designerName }: { link: string; personName: string; designerName: string }): string {
  const safe = link.replace(/"/g, "&quot;");
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>veedeck — przypomnienie</title><style>body{margin:0;padding:0;background:#D9D6FF;}a{color:#4F46E5;}</style></head><body style="margin:0;padding:0;background:#D9D6FF;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;"><tr><td align="center" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td style="padding:0 6px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;padding-right:10px;"><img src="${ICON_URL}" width="30" height="30" alt="veedeck" style="display:block;"></td><td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td></tr></table></td></tr><tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:44px 48px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Przypomnienie</div><h1 style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">Twoj panel czeka, ${personName}.</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">${designerName} udostepnil Ci panel projektu w veedeck.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;"><tr><td style="border-radius:12px;background:#4F46E5;"><a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Otworz panel projektu</a></td></tr></table><div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div><p style="margin:0;font-size:13px;color:#8A8D9A;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;">${link}</a></p></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

export function firstLoginNotificationEmailPL({ personName, role, date, time }: { personName: string; role: string; date: string; time: string }): string {
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>veedeck</title><style>body{margin:0;padding:0;background:#D9D6FF;}</style></head><body style="margin:0;padding:0;background:#D9D6FF;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;"><tr><td align="center" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td style="padding:0 6px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;padding-right:10px;"><img src="${ICON_URL}" width="30" height="30" alt="veedeck" style="display:block;"></td><td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td></tr></table></td></tr><tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:44px 48px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#4F46E5;">Aktywacja panelu</div><h1 style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:26px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">${role} ${personName} otworzyl panel.</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">${personName} po raz pierwszy zalogowal sie do panelu w veedeck.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0;"><tr><td style="background:#F2F3F7;border-radius:14px;padding:18px 22px;font-size:14px;line-height:1.8;color:#565A69;">Data: <b style="color:#24252B;">${date}</b><br>Godzina: <b style="color:#24252B;">${time}</b></td></tr></table></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}

export function listSharedClientEmailPL({ listUrl, listName, designerName, projectTitle }: {
  listUrl: string;
  listName: string;
  designerName: string;
  projectTitle: string;
}): string {
  const safe = listUrl.replace(/"/g, "&quot;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>veedeck — nowa lista zakupowa</title>
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #F5F5F5; }
  a { color: #4F46E5; }
  a:hover { color: #4338CA; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F5F5;font-size:1px;line-height:1px;">Projektant udostępnił Ci nową listę zakupową. Kliknij, aby ją zobaczyć.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">

                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                      <tr>
                        <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                        <td style="vertical-align:middle;line-height:1;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                      </tr>
                    </table>

                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Lista zakupowa</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Nowa lista zakupowa
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      <b style="color:#24252B;">${designerName}</b> udostępnił(a) Ci listę zakupową <b style="color:#24252B;">„${listName}"</b> w&nbsp;projekcie <b style="color:#24252B;">${projectTitle}</b>.
                    </p>

                    <!-- CTA -->
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="border-radius:12px;background:#4F46E5;">
                          <a href="${safe}" style="display:inline-block;padding:15px 30px;font-family:'DM Sans',Arial,sans-serif;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:12px;">Przejdź do listy</a>
                        </td>
                      </tr>
                    </table>

                    <!-- Info box -->
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                      <tr>
                        <td style="background:#F2F3F7;border-radius:14px;padding:22px 24px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td style="padding:0 0 10px;vertical-align:top;width:32px;font-size:16px;line-height:1;">🛒</td>
                              <td style="padding:0 0 10px;vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Na liście znajdziesz produkty dobrane przez projektanta do Twojego projektu — z cenami, linkami i&nbsp;zdjęciami.</td>
                            </tr>
                            <tr>
                              <td style="vertical-align:top;width:32px;font-size:16px;line-height:1;">✅</td>
                              <td style="vertical-align:top;font-size:14px;line-height:1.6;color:#565A69;">Możesz zaakceptować lub odrzucić każdy produkt bezpośrednio z&nbsp;poziomu listy.</td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.5;color:#8A8D9A;">Przycisk nie działa? Wklej ten link do przeglądarki:</p>
                    <p style="margin:10px 0 0;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safe}" style="color:#4F46E5;text-decoration:underline;">${listUrl}</a></p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli nie spodziewałeś(aś) się tej wiadomości, zignoruj ją.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck - Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function accountDeactivationEmailPL({ designerName }: { designerName: string }): string {
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<!--[if mso]><style>* { font-family: Arial, sans-serif !important; }</style><![endif]-->
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@600;700&family=Nunito:wght@300&display=swap');
  body { margin: 0; padding: 0; background: #F5F5F5; }
  @media (max-width: 620px) {
    .vd-card-pad { padding: 32px 24px !important; }
    .vd-outer-pad { padding: 24px 12px !important; }
    .vd-h1 { font-size: 26px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F5F5F5;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#F5F5F5;font-size:1px;line-height:1px;">Twój dostęp do panelu klienta veedeck został dezaktywowany.</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F5F5F5;">
    <tr>
      <td align="center" class="vd-outer-pad" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <tr>
            <td style="padding:0 6px 22px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;"><svg width="20" height="20" viewBox="0 0 414 414" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="414" height="414" rx="30" fill="#4F46E5"/><path d="M285.35 137.708C276.079 121.583 264.61 106.1 251.437 91.8967C247.681 87.8474 241.335 87.8601 237.429 91.7654L220.356 108.839C217.788 111.406 216.814 115.164 217.811 118.656L249.875 230.935C251.461 236.489 250.019 242.375 245.959 245.959C242.375 250.019 236.216 251.734 230.662 250.148L118.382 218.085C114.891 217.088 111.133 218.062 108.565 220.629L91.7654 237.429C87.8601 241.335 87.8474 247.681 91.8967 251.437C106.1 264.61 121.583 276.079 137.708 285.35C156.603 296.214 176.008 303.847 194.816 307.816C213.624 311.784 231.466 312.009 247.323 308.478C263.18 304.947 276.743 297.729 287.236 287.236C297.729 276.743 304.947 263.18 308.478 247.323C312.009 231.466 311.784 213.624 307.816 194.816C303.848 176.008 296.214 156.603 285.35 137.708Z" fill="white"/><path d="M209.499 201.188C210.695 205.649 206.612 209.732 202.151 208.536L147.777 193.967C143.316 192.772 141.822 187.195 145.088 183.929L184.892 144.125C188.158 140.859 193.735 142.353 194.93 146.814L209.499 201.188Z" fill="white"/></svg></td>
                  <td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="vd-card-pad" style="padding:44px 48px;">
                    <div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Dezaktywacja dostępu</div>

                    <h1 class="vd-h1" style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:30px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">
                      Twój dostęp został dezaktywowany
                    </h1>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Projektant <strong>${safe(designerName)}</strong> dezaktywował Twój dostęp do panelu klienta veedeck. Od teraz nie możesz logować się do platformy.
                    </p>

                    <p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">
                      Jeśli uważasz, że to pomyłka lub masz pytania — skontaktuj się bezpośrednio ze swoim projektantem.
                    </p>

                    <div style="border-top:1px solid #E5E7EB;margin:32px 0;"></div>

                    <p style="margin:0;font-size:13px;line-height:1.6;color:#A0A3AE;">Jeśli nie korzystałeś/aś z konta klienta veedeck, zignoruj tę wiadomość.</p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:26px 24px 8px;text-align:center;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8D9A;">veedeck — Visualize, Design, Deliver. Platforma dla projektantów wnętrz.</p>
              <p style="margin:10px 0 0;font-size:13px;line-height:1.6;color:#A0A3AE;">
                <a href="${PRIVACY_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Polityka prywatności</a>
                &nbsp;·&nbsp;
                <a href="${COOKIES_URL_PL}" style="color:#8A8D9A;text-decoration:none;">Cookies</a>
                &nbsp;·&nbsp;
                <a href="mailto:${CONTACT_EMAIL}" style="color:#8A8D9A;text-decoration:none;">${CONTACT_EMAIL}</a>
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

export function passwordSetEmailPL(personName: string): string {
  return `<!DOCTYPE html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>veedeck</title><style>body{margin:0;padding:0;background:#D9D6FF;}</style></head><body style="margin:0;padding:0;background:#D9D6FF;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#D9D6FF;"><tr><td align="center" style="padding:40px 16px;font-family:'DM Sans',-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;"><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;"><tr><td style="padding:0 6px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:middle;padding-right:10px;"><img src="${ICON_URL}" width="30" height="30" alt="veedeck" style="display:block;"></td><td style="vertical-align:middle;font-family:'Nunito',Arial,sans-serif;font-size:19px;font-weight:300;letter-spacing:-0.05em;color:#24252B;">veedeck</td></tr></table></td></tr><tr><td style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:44px 48px;"><div style="font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;color:#8A8D9A;">Bezpieczenstwo konta</div><h1 style="margin:10px 0 0;font-family:'Inter',Arial,sans-serif;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.025em;color:#24252B;">Haslo zostalo ustawione.</h1><p style="margin:16px 0 0;font-size:16px;line-height:1.6;color:#565A69;">Czesc, ${personName}. Do Twojego konta veedeck ustawiono haslo. Mozesz teraz logowac sie swoim adresem e-mail i haslem.</p><p style="margin:20px 0 0;font-size:14px;line-height:1.6;color:#8A8D9A;">Jesli to nie Ty ustawiles haslo, skontaktuj sie niezwlocznie ze swoim projektantem.</p></td></tr></table></td></tr></table></td></tr></table></body></html>`;
}
