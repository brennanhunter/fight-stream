import { NextResponse, type NextRequest } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { welcomeEmail } from '@/lib/emails/welcome';
import { unsubscribeUrl, unsubscribeHeaders } from '@/lib/emails/unsubscribe';

const resend = new Resend(process.env.RESEND_API_KEY);

function sanitizeRedirect(path: string | null): string {
  if (!path || !/^\/[a-zA-Z0-9]/.test(path) || /[:\\]/.test(path)) return '/account';
  return path.split('?')[0];
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = sanitizeRedirect(searchParams.get('next'));

  const allowedTypes = ['signup', 'recovery', 'email'] as const;
  type AllowedType = typeof allowedTypes[number];

  if (token_hash && type && allowedTypes.includes(type as AllowedType)) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as AllowedType,
    });

    if (!error) {
      // Send welcome email for new signups
      if (type === 'signup') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email && !user.user_metadata?.welcome_email_sent) {
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
        } catch (emailErr) {
          console.error('Welcome email failed:', emailErr);
        }
      }

      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
