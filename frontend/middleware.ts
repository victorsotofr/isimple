import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import {
  getSupabaseAuthStorageKeys,
  isInvalidRefreshTokenError,
  isSupabaseAuthStorageName,
} from './src/lib/supabase-auth';

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const names = new Set([
    ...getSupabaseAuthStorageKeys(),
    ...request.cookies
      .getAll()
      .map(cookie => cookie.name)
      .filter(name => isSupabaseAuthStorageName(name)),
  ]);

  names.forEach(name => {
    request.cookies.delete(name);
    response.cookies.set(name, '', { path: '/', maxAge: 0 });
  });

  return response;
}

export async function middleware(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('[Middleware] Variables Supabase manquantes');
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const protectedPaths = [
    '/inbox', '/tickets', '/lots', '/tenants', '/prospects',
    '/agenda', '/prestataires', '/analytics', '/settings',
    '/documents', '/profile',
  ];
  const isProtectedPath = protectedPaths.some(
    path => request.nextUrl.pathname.startsWith(path)
  );

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2]);
            });
          },
        },
      }
    );

    // Refresh session — ne pas supprimer, nécessaire pour que le token reste valide
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error && isInvalidRefreshTokenError(error)) {
      if (isProtectedPath) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', request.nextUrl.pathname);
        return clearSupabaseAuthCookies(request, NextResponse.redirect(url));
      }

      return clearSupabaseAuthCookies(request, supabaseResponse);
    }

    if (!user && isProtectedPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Redirection post-login : si déjà connecté sur /login ou /signup
    const authPaths = ['/login', '/signup'];
    const isAuthPath = authPaths.includes(request.nextUrl.pathname);

    if (user && isAuthPath) {
      const url = request.nextUrl.clone();
      url.pathname = '/inbox';
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  } catch (error) {
    console.error('[Middleware] Erreur auth :', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
