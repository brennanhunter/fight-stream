import { NextResponse } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { welcomeEmail } from '@/lib/emails/welcome';
import { unsubscribeUrl, unsubscribeHeaders } from '@/lib/emails/unsubscribe';

const resend = new Resend(process.env.RESEND_API_KEY);

function sanitizeRedirect(path: string | null): string {
  if (!path || !/^\/[a-zA-Z0-9]/.test(path) || /[:\\]/.test(path)) return '/account';
  return path.split('?')[0];
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizeRedirect(searchParams.get('next'));

  if (code) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Send welcome email for brand-new OAuth signups (created within last 2 minutes)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && !user.user_metadata?.welcome_email_sent) {
          const createdAt = new Date(user.created_at).getTime();
          const isNewUser = Date.now() - createdAt < 2 * 60 * 1000;
          if (isNewUser) {
            const { html, text } = welcomeEmail({ unsubscribeUrl: unsubscribeUrl(user.email) });
            await resend.emails.send({
              from: 'BoxStreamTV <hunter@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: user.email,
              subject: 'Welcome to BoxStreamTV — your ringside seat awaits',
              html,
              text,
              headers: unsubscribeHeaders(user.email),
            });
            await supabase.auth.updateUser({ data: { welcome_email_sent: true } });
          }
        }
      } catch (emailErr) {
        console.error('Welcome email failed:', emailErr);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth error — redirect to login with error message
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
