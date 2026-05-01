import { escapeHtml } from '@/lib/utils';

export function vodRecoveryLinkEmail({
  link,
  vodCount,
}: {
  link: string;
  vodCount: number;
}) {
  const safeLink = escapeHtml(link);
  const vodLabel = vodCount === 1 ? '1 replay' : `${vodCount} replays`;
  const safeVodLabel = escapeHtml(vodLabel);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recover Your Replays – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width="72" height="72" style="display:block;border:0;margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);padding:40px 36px;background-color:#0a0a0a;">

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                Recover Your Replays
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 20px;"></div>

              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                We found <strong style="color:#ffffff;">${safeVodLabel}</strong> linked to this email.<br />
                Click the button below to restore access on this device.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="${safeLink}" style="display:inline-block;background-color:#ffffff;color:#000000;text-decoration:none;font-weight:700;padding:16px 40px;font-size:14px;letter-spacing:0.15em;text-transform:uppercase;">
                      Restore Access
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:13px;color:#6b7280;text-align:center;">
                This link expires in <strong style="color:#9ca3af;">15 minutes</strong>.
              </p>

              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Didn&rsquo;t request this? Ignore this email — your access is safe.<br />
                Need help? Email <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
              </p>

            </td>
          </tr>

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

  const text = `Recover Your Replays — BoxStreamTV

We found ${vodLabel} linked to this email. Click the link below to restore access on this device:

${link}

This link expires in 15 minutes.

Didn't request this? Ignore this email — your access is safe.
Need help? Email hunter@boxstreamtv.com`;

  return { html, text };
}
