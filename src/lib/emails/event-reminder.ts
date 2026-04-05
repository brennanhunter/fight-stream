export function eventReminderEmail({
  eventName,
  eventDate,
}: {
  eventName: string;
  eventDate: string;
}) {
  const dateFormatted = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const timeFormatted = new Date(eventDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fight Tomorrow – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td align="center" style="padding-bottom:32px;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#6b7280;">BOXSTREAMTV</p>
            </td>
          </tr>

          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);padding:40px 36px;background-color:#0a0a0a;">

              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#f59e0b;text-align:center;">Tomorrow Night</p>
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                ${eventName}
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>

              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                Your fight is tomorrow. Make sure you&rsquo;re ready to watch.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Date</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${dateFormatted}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Time</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${timeFormatted}</p>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://boxstreamtv.com" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      Watch Tomorrow
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Can&rsquo;t watch live? The replay will be available after the event.<br />
                Questions? Email <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
              </p>

            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#374151;">
                &copy; ${new Date().getFullYear()} BoxStreamTV &middot;
                <a href="https://boxstreamtv.com/privacy" style="color:#374151;text-decoration:underline;">Privacy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${eventName} is Tomorrow – BoxStreamTV

Your fight is tomorrow. Make sure you're ready to watch.

Date: ${dateFormatted}
Time: ${timeFormatted}

Watch at https://boxstreamtv.com

Can't watch live? The replay will be available after the event.
Questions? Email hunter@boxstreamtv.com`;

  return { html, text };
}
