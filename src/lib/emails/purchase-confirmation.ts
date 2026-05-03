import { escapeHtml } from '@/lib/utils';

export function purchaseConfirmationEmail({
  eventName,
  expiresAt,
  amountPaid,
  purchaseType = 'ppv',
  vodPurchaseId,
  magicLink,
}: {
  eventName: string;
  expiresAt: string | null;
  amountPaid: number; // cents
  purchaseType?: 'ppv' | 'vod';
  vodPurchaseId?: string;
  /**
   * Tokenized watch link that grants access on whatever device the buyer
   * clicks from. When present on a VOD email this overrides the
   * session-bound /watch?purchase_id link — guests can watch from any
   * device without going through the recovery flow.
   */
  magicLink?: string;
}) {
  const safeEventName = escapeHtml(eventName);
  const isVod = purchaseType === 'vod';

  const expiryFormatted = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : isVod
      ? 'Lifetime access'
      : 'Active — check boxstreamtv.com/account for details';

  const amountFormatted =
    amountPaid > 0
      ? `$${(amountPaid / 100).toFixed(2)}`
      : 'Free (promo applied)';

  const headline = isVod ? 'Your video is ready.' : 'You\'re in.';
  const subtext = isVod
    ? `<strong style="color:#ffffff;">${safeEventName}</strong> is available to watch now in your VOD library.`
    : `Your purchase for <strong style="color:#ffffff;">${safeEventName}</strong> has been confirmed. Head to the home page when the fight starts — your access is ready.`;
  const ctaLabel = isVod ? 'Watch Now' : 'Go to BoxStreamTV';
  const ctaUrl = isVod && magicLink
    ? magicLink
    : isVod && vodPurchaseId
      ? `https://boxstreamtv.com/watch?purchase_id=${encodeURIComponent(vodPurchaseId)}`
      : isVod
        ? 'https://boxstreamtv.com/vod'
        : 'https://boxstreamtv.com';

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
                ${headline}
              </h1>
              <div style="width:40px;height:2px;background-color:#ffffff;margin:0 auto 24px;"></div>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;text-align:center;line-height:1.6;">
                ${subtext}
              </p>

              <!-- Details table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(255,255,255,0.1);margin-bottom:28px;">
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">${isVod ? 'Video' : 'Event'}</p>
                    <p style="margin:4px 0 0;font-size:15px;font-weight:600;color:#ffffff;">${safeEventName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#6b7280;">Access</p>
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
                    <a href="${ctaUrl}" style="display:inline-block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;text-decoration:none;padding:14px 36px;">
                      ${ctaLabel}
                    </a>
                  </td>
                </tr>
              </table>

              ${
                isVod && magicLink
                  ? `<p style="margin:0 0 16px;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;">
                      Save this email — the button above unlocks your replay on <strong style="color:#9ca3af;">any device</strong>, no account required.
                    </p>`
                  : ''
              }

              <!-- Support note -->
              <p style="margin:0;font-size:12px;color:#4b5563;text-align:center;line-height:1.6;">
                Having trouble? Email us at
                <a href="mailto:hunter@boxstreamtv.com" style="color:#9ca3af;text-decoration:underline;">hunter@boxstreamtv.com</a>
                and we&rsquo;ll make it right.
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
                &middot;
                <a href="https://www.instagram.com/boxstreamtv/" style="color:#374151;text-decoration:underline;">Instagram</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const watchUrlText = isVod && magicLink
    ? magicLink
    : vodPurchaseId
      ? `https://boxstreamtv.com/watch?purchase_id=${vodPurchaseId}`
      : 'https://boxstreamtv.com/vod';

  const text = isVod
    ? `Purchase Confirmed – BoxStreamTV

Your video is ready. ${eventName} is available to watch now.

Video: ${eventName}
Access: ${expiryFormatted}
Amount Paid: ${amountFormatted}

Watch now: ${watchUrlText}
${magicLink ? '\nThis link unlocks your replay on any device — no account required. Save this email.\n' : ''}
Having trouble? Email hunter@boxstreamtv.com and we'll make it right.

BoxStreamTV | https://boxstreamtv.com`
    : `Purchase Confirmed – BoxStreamTV

You're in. Your purchase for ${eventName} has been confirmed.

Event: ${eventName}
Access Until: ${expiryFormatted}
Amount Paid: ${amountFormatted}

Head to https://boxstreamtv.com when the fight starts — your access is ready.

Having trouble? Email hunter@boxstreamtv.com and we'll make it right.

BoxStreamTV | https://boxstreamtv.com`;

  return { html, text };
}
