export function paymentFailedEmail({
  tier,
  nextRetryDate,
}: {
  tier: 'basic' | 'premium';
  nextRetryDate: string | null;
}) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';

  const retryFormatted = nextRetryDate
    ? new Date(nextRetryDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Payment Failed – BoxStreamTV</title>
</head>
<body style="margin:0;padding:0;background-color:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Header -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <img src="https://boxstreamtv.com/logos/BoxStreamThumbnail.png" alt="BoxStreamTV" width="72" height="72" style="display:block;border:0;margin:0 auto;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="border:1px solid rgba(255,255,255,0.12);padding:40px 36px;background-color:#0a0a0a;">

              <!-- Warning icon -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <div style="width:56px;height:56px;border:1px solid rgba(239,68,68,0.3);display:inline-flex;align-items:center;justify-content:center;margin:0 auto;">
                      <span style="font-size:24px;color:#ef4444;">!</span>
                    </div>
                  </td>
                </tr>
              </table>

              <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                Payment Failed
              </h1>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;text-align:center;">
                Fight Pass ${tierLabel}
              </p>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>

              <p style="margin:0 0 24px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                We weren&rsquo;t able to charge your card for your Fight Pass ${tierLabel} subscription.
                Your access is still active for now — please update your payment method to avoid losing it.
              </p>

              ${
                retryFormatted
                  ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Next retry</p>
                          <p style="margin:6px 0 0;font-size:16px;font-weight:600;color:#ffffff;">${retryFormatted}</p>
                        </td>
                      </tr>
                    </table>`
                  : `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                      <tr>
                        <td style="padding:16px 20px;">
                          <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Next retry</p>
                          <p style="margin:6px 0 0;font-size:15px;font-weight:600;color:#ffffff;">Within the next 3&ndash;5 days</p>
                          <p style="margin:6px 0 0;font-size:13px;color:#9ca3af;">If it fails again, your access will be paused.</p>
                        </td>
                      </tr>
                    </table>`
              }

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://boxstreamtv.com/account/subscription" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      Update Payment Method
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                If you need help, email us at
                <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:11px;color:#374151;">
                &copy; ${new Date().getFullYear()} BoxStreamTV &middot;
                <a href="https://boxstreamtv.com/account/subscription" style="color:#374151;text-decoration:underline;">Manage Subscription</a>
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

  const text = `Payment Failed – BoxStreamTV

We weren't able to charge your card for your Fight Pass ${tierLabel} subscription.
Your access is still active for now — please update your payment method to avoid losing it.
${retryFormatted ? `\nNext retry: ${retryFormatted}` : '\nStripe will retry your card within the next 3–5 days. If it fails again, your access will be paused.'}

Update your payment method: https://boxstreamtv.com/account/subscription

Need help? Email hunter@boxstreamtv.com`;

  return { html, text };
}
