export function eventAnnouncedEmail({
  eventName,
  eventDate,
  ppvPrice,
}: {
  eventName: string;
  eventDate: string;
  ppvPrice: string;
}) {
  const dateFormatted = new Date(eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${eventName} – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width="72" height="72" style="display:block;border:0;margin:0 auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);background-color:#0a0a0a;">

              <!-- Accent stripe -->
              <div style="height:3px;background-color:#ef4444;display:block;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 36px 40px;">
                <tr>
                  <td>

                    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#ef4444;">
                      New Event
                    </p>
                    <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">
                      ${eventName}
                    </h1>
                    <div style="width:40px;height:2px;background-color:#ef4444;margin:0 0 24px;"></div>

                    <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
                      A new live event is coming to BoxStreamTV. Mark your calendar and secure your access now.
                    </p>

                    <!-- Event details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:2px solid #ef4444;padding-left:20px;margin-bottom:32px;">
                      <tr>
                        <td style="padding:0 0 6px;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Date</p>
                          <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;">${dateFormatted}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top:16px;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">PPV Price</p>
                          <p style="margin:0;font-size:16px;font-weight:600;color:#ffffff;">${ppvPrice}</p>
                        </td>
                      </tr>
                    </table>

                    <!-- Fight Pass note -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);padding:16px 20px;margin-bottom:28px;">
                      <tr>
                        <td>
                          <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
                            <strong style="color:#ffffff;">Fight Pass Premium?</strong> This event is included. Fight Pass Basic gets 25% off PPV.
                            <a href="https://boxstreamtv.com/pricing" style="color:#9ca3af;text-decoration:underline;">View plans &rarr;</a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td align="center">
                          <a href="https://boxstreamtv.com/" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;padding:16px 36px;">
                            Get Access &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                      Questions? <a href="mailto:hunter@boxstreamtv.com" style="color:#6b7280;">hunter@boxstreamtv.com</a>
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#374151;">
                &copy; ${new Date().getFullYear()} BoxStreamTV &middot;
                <a href="https://boxstreamtv.com/account" style="color:#374151;text-decoration:underline;">My Account</a>
                &middot;
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

  const text = `${eventName} is coming to BoxStreamTV

Date: ${dateFormatted}
PPV Price: ${ppvPrice}

Fight Pass Premium includes this event. Fight Pass Basic gets 25% off.

Get access: https://boxstreamtv.com/
View Fight Pass plans: https://boxstreamtv.com/pricing

Questions? hunter@boxstreamtv.com`;

  return { html, text };
}
