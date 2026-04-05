import { NextResponse, type NextRequest } from 'next/server';
import { createAuthServerClient } from '@/lib/supabase-server';
import { Resend } from 'resend';
import { welcomeEmail } from '@/lib/emails/welcome';

const resend = new Resend(process.env.RESEND_API_KEY);

function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/account';
  return path;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = sanitizeRedirect(searchParams.get('next'));

  if (token_hash && type) {
    const supabase = await createAuthServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'recovery' | 'email',
    });

    if (!error) {
      // Send welcome email for new signups
      if (type === 'signup') {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const { html, text } = welcomeEmail();
            await resend.emails.send({
              from: 'BoxStreamTV <noreply@boxstreamtv.com>',
              replyTo: 'hunter@boxstreamtv.com',
              to: user.email,
              subject: 'Welcome to BoxStreamTV — your ringside seat awaits',
              html,
              text,
            });
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
