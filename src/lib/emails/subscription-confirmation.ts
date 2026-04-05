export function subscriptionConfirmationEmail({
  tier,
  currentPeriodEnd,
}: {
  tier: 'basic' | 'premium';
  currentPeriodEnd: string | null;
}) {
  const tierLabel = tier === 'premium' ? 'Premium' : 'Basic';

  const renewalFormatted = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const perks =
    tier === 'premium'
      ? [
          'Unlimited VOD replays of all past events',
          'Discounted PPV pricing on every live event',
          'Early access to new events',
        ]
      : [
          'Unlimited VOD replays of all past events',
          'Discounted PPV pricing on live events',
        ];

  const perkRows = perks
    .map(
      (p) => `
        <tr>
          <td style="padding:10px 20px;border-bottom:1px solid rgba(255,255,255,0.06);color:#9ca3af;font-size:14px;">
            <span style="color:#ffffff;margin-right:10px;">—</span>${p}
          </td>
        </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Fight Pass – BoxStreamTV</title>
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
              <h1 style="margin:0 0 4px;font-size:26px;font-weight:700;color:#ffffff;text-align:center;letter-spacing:-0.02em;">
                Welcome to Fight Pass
              </h1>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;text-align:center;">
                ${tierLabel} Plan
              </p>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>

              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                Your Fight Pass ${tierLabel} subscription is active. Here&rsquo;s what you get:
              </p>

              <!-- Perks -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                ${perkRows}
              </table>

              ${
                renewalFormatted
                  ? `<p style="margin:0 0 28px;font-size:13px;color:#6b7280;text-align:center;">
                      Your subscription renews on <strong style="color:#9ca3af;">${renewalFormatted}</strong>.
                      Cancel anytime from your account settings.
                    </p>`
                  : ''
              }

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <a href="https://boxstreamtv.com/vod" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      Watch Now
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support -->
              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Questions? Email us at
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

  const text = `Welcome to Fight Pass ${tierLabel} – BoxStreamTV

Your Fight Pass ${tierLabel} subscription is active.

What's included:
${perks.map((p) => `- ${p}`).join('\n')}
${renewalFormatted ? `\nYour subscription renews on ${renewalFormatted}. Cancel anytime from your account settings.` : ''}

Watch now at https://boxstreamtv.com/vod

Questions? Email hunter@boxstreamtv.com

Manage your subscription: https://boxstreamtv.com/account/subscription`;

  return { html, text };
}
