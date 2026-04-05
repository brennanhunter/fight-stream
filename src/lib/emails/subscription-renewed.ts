export function subscriptionRenewedEmail({
  tier,
  amountPaid,
  nextRenewal,
}: {
  tier: 'basic' | 'premium';
  amountPaid: string;
  nextRenewal: string | null;
}) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';
  const nextRenewalFormatted = nextRenewal
    ? new Date(nextRenewal).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Fight Pass Renewed – BoxStreamTV</title>
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
              <div style="height:3px;background-color:#22c55e;display:block;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 36px 40px;">
                <tr>
                  <td>

                    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#22c55e;">
                      Fight Pass ${tierLabel}
                    </p>
                    <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">
                      Subscription Renewed
                    </h1>
                    <div style="width:40px;height:2px;background-color:#22c55e;margin:0 0 24px;"></div>

                    <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
                      Your Fight Pass ${tierLabel} has been renewed. You&rsquo;re all set for another month.
                    </p>

                    <!-- Details -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                      <tr>
                        <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Plan</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">Fight Pass ${tierLabel}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Amount Charged</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${amountPaid}</p>
                        </td>
                      </tr>
                      ${nextRenewalFormatted ? `
                      <tr>
                        <td style="padding:14px 20px;">
                          <p style="margin:0 0 2px;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Next Renewal</p>
                          <p style="margin:0;font-size:15px;font-weight:600;color:#ffffff;">${nextRenewalFormatted}</p>
                        </td>
                      </tr>` : ''}
                    </table>

                    <!-- CTA -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td align="center">
                          <a href="https://boxstreamtv.com/vod" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;padding:16px 36px;">
                            Watch Now &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                      Manage your subscription &mdash;
                      <a href="https://boxstreamtv.com/account/subscription" style="color:#6b7280;">Account Settings</a>
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
                <a href="https://boxstreamtv.com/account/subscription" style="color:#374151;text-decoration:underline;">Manage</a>
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

  const text = `Fight Pass ${tierLabel} Renewed – BoxStreamTV

Your Fight Pass ${tierLabel} has been renewed.

Plan: Fight Pass ${tierLabel}
Amount Charged: ${amountPaid}
${nextRenewalFormatted ? `Next Renewal: ${nextRenewalFormatted}` : ''}

Watch now: https://boxstreamtv.com/vod

Manage subscription: https://boxstreamtv.com/account/subscription`;

  return { html, text };
}
