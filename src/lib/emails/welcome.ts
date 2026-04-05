export function welcomeEmail() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to BoxStreamTV</title>
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
              <div style="height:3px;background-color:#ffffff;display:block;"></div>

              <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 36px 40px;">
                <tr>
                  <td>

                    <p style="margin:0 0 12px;font-size:10px;font-weight:700;letter-spacing:0.3em;text-transform:uppercase;color:#9ca3af;">
                      Welcome
                    </p>
                    <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;line-height:1.2;">
                      You&rsquo;re in.
                    </h1>
                    <div style="width:40px;height:2px;background-color:#ffffff;margin:0 0 24px;"></div>

                    <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.6;">
                      Welcome to BoxStreamTV &mdash; live independent boxing, PPV events, and a growing library of fight replays. All in your browser, no app required.
                    </p>

                    <!-- What you can do -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-left:2px solid #ffffff;padding-left:20px;margin-bottom:32px;">
                      <tr><td style="padding:0 0 10px;font-size:14px;color:#9ca3af;line-height:1.6;"><span style="color:#ffffff;margin-right:10px;">—</span>Watch live PPV events from your browser</td></tr>
                      <tr><td style="padding:0 0 10px;font-size:14px;color:#9ca3af;line-height:1.6;"><span style="color:#ffffff;margin-right:10px;">—</span>Stream full event replays on demand</td></tr>
                      <tr><td style="padding:0;font-size:14px;color:#9ca3af;line-height:1.6;"><span style="color:#ffffff;margin-right:10px;">—</span>Fight Pass unlocks the whole library</td></tr>
                    </table>

                    <!-- CTAs -->
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="padding-right:8px;" width="50%">
                          <a href="https://boxstreamtv.com/vod" style="display:block;background-color:#ffffff;color:#000000;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;padding:14px;text-align:center;">
                            Browse VOD
                          </a>
                        </td>
                        <td style="padding-left:8px;" width="50%">
                          <a href="https://boxstreamtv.com/pricing" style="display:block;background-color:transparent;color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;padding:14px;text-align:center;border:1px solid rgba(255,255,255,0.3);">
                            Get Fight Pass
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

  const text = `Welcome to BoxStreamTV

You're in. Here's what you can do:

- Watch live PPV events from your browser
- Stream full event replays on demand
- Fight Pass unlocks the whole library

Browse VOD: https://boxstreamtv.com/vod
Get Fight Pass: https://boxstreamtv.com/pricing

Questions? hunter@boxstreamtv.com`;

  return { html, text };
}
