import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, verifyAdminCookie } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  // CSRF protection: validate Origin on state-changing requests to API routes
  // Exempt /api/inngest — Inngest's servers send PUT requests without an Origin header
  if (
    request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/inngest') &&
    ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)
  ) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    if (!origin || !host || new URL(origin).host !== host) {
      return NextResponse.json(
        { error: 'Invalid request origin' },
        { status: 403 }
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth session (important — keeps cookies alive)
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    console.error('Middleware auth check failed:', err);
  }

  // Protect /admin routes — redirect to /admin/login if not authenticated
  if (
    request.nextUrl.pathname.startsWith('/admin') &&
    request.nextUrl.pathname !== '/admin/login'
  ) {
    const adminCookie = request.cookies.get(ADMIN_COOKIE);
    if (!await verifyAdminCookie(adminCookie?.value)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }
  }

  // Protect /account routes — redirect to login if unauthenticated
  if (!user && request.nextUrl.pathname.startsWith('/account')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  // Note: /reset-password is intentionally excluded — the recovery flow
  // (via /auth/confirm?type=recovery) establishes an authenticated session
  // BEFORE redirecting here, so the user must be logged in to reset.
  if (user && (
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/signup' ||
    request.nextUrl.pathname === '/forgot-password'
  )) {
    const url = request.nextUrl.clone();
    url.pathname = '/account';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Run on all routes except static files, webhooks, and API routes that don't need auth
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|logos|fonts|event-posters|new-event-posters-Dec|replays|api/webhooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|wasm)$).*)',
  ],
};
