import { escapeHtml } from '@/lib/utils';

export function eventStartingEmail({ eventName, unsubscribeUrl }: { eventName: string; unsubscribeUrl?: string }) {
  const safeEventName = escapeHtml(eventName);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fight Starting Now – BoxStreamTV</title>
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

              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#ef4444;text-align:center;">Live Now</p>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                ${safeEventName}
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>

              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                The fight is starting now. Head to BoxStreamTV to watch live.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://boxstreamtv.com" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      Watch Now
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Having trouble? Email <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#374151;">
                &copy; ${new Date().getFullYear()} BoxStreamTV &middot;
                <a href="https://boxstreamtv.com/privacy" style="color:#374151;text-decoration:underline;">Privacy</a>
                ${unsubscribeUrl ? `&middot; <a href="${unsubscribeUrl}" style="color:#374151;text-decoration:underline;">Unsubscribe</a>` : ''}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${eventName} is Live Now – BoxStreamTV

The fight is starting now. Head to BoxStreamTV to watch live.

Watch at https://boxstreamtv.com

Having trouble? Email hunter@boxstreamtv.com
${unsubscribeUrl ? `\nUnsubscribe: ${unsubscribeUrl}` : ''}`;

  return { html, text };
}
