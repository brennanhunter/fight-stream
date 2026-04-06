export function purchaseConfirmationEmail({
  eventName,
  expiresAt,
  amountPaid,
}: {
  eventName: string;
  expiresAt: string | null;
  amountPaid: number; // cents
}) {
  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Lifetime access';

  const amountFormatted =
    amountPaid > 0
      ? `$${(amountPaid / 100).toFixed(2)}`
      : 'Free (promo applied)';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Purchase Confirmation – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width="72" height="72" style="display:block;border:0;margin:0 auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);padding:40px 36px;background-color:#0a0a0a;">

              <!-- Check icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="width:56px;height:56px;border:1px solid rgba(255,255,255,0.2);display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
                      <span style="font-size:24px;color:#ffffff;">✓</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Title -->
              <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                You're in.
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                Your purchase for <strong style="color:#ffffff;">${eventName}</strong> has been confirmed.
                Head to the home page when the fight starts — your access is ready.
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Event</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${eventName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Access Until</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${expiryFormatted}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Amount Paid</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${amountFormatted}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://boxstreamtv.com" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      Watch Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support note -->
              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Having trouble? Email us at
                <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
                and we&rsquo;ll get you sorted.
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

  const text = `Purchase Confirmed – BoxStreamTV

You're in. Your purchase for ${eventName} has been confirmed.

Event: ${eventName}
Access Until: ${expiryFormatted}
Amount Paid: ${amountFormatted}

Head to https://boxstreamtv.com when the fight starts — your access is ready.

Having trouble? Email hunter@boxstreamtv.com and we'll get you sorted.

BoxStreamTV | https://boxstreamtv.com`;

  return { html, text };
}
