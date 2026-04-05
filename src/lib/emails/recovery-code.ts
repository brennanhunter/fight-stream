export function recoveryCodeEmail({
  eventName,
  code,
}: {
  eventName: string;
  code: string;
}) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Access Code – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#6b7280;">
                BOXSTREAMTV
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);padding:40px 36px;background-color:#0a0a0a;">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                Your Access Code
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 20px;"></div>

              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                Enter this code to restore your access to
                <strong style="color:#ffffff;">${eventName}</strong>.
              </p>

              <!-- Code block -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="border:1px solid rgba(255,255,255,0.2);display:inline-block;padding:20px 40px;">
                      <span style="font-size:36px;font-weight:700;color:#ffffff;letter-spacing:0.3em;">${code}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:13px;color:#6b7280;text-align:center;">
                This code expires in <strong style="color:#9ca3af;">15 minutes</strong>.
              </p>

              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Didn&rsquo;t request this? Ignore this email — your access is safe.<br />
                Need help? Email <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#374151;">
                &copy; ${new Date().getFullYear()} BoxStreamTV &middot;
                <a href="https://boxstreamtv.com/privacy" style="color:#374151;text-decoration:underline;">Privacy</a>
                &middot;
                <a href="https://boxstreamtv.com/terms" style="color:#374151;text-decoration:underline;">Terms</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Your BoxStreamTV Access Code

Enter this code to restore your access to ${eventName}:

${code}

This code expires in 15 minutes.

Didn't request this? Ignore this email — your access is safe.
Need help? Email hunter@boxstreamtv.com`;

  return { html, text };
}
