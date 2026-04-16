import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Client Supabase côté serveur (Server Components, Server Actions, Route Handlers).
 * Utilise @supabase/ssr pour le refresh automatique des tokens via cookies.
 */
export async function createServerClient() {
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error('[Supabase Server] NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY manquant');
    return { supabase: null, error: 'Variables Supabase manquantes' };
  }

  try {
    const supabase = createSSRServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll appelé depuis un Server Component — safe à ignorer
            // quand le middleware rafraîchit la session
          }
        },
      },
    });

    return { supabase, error: null };
  } catch (error) {
    console.error('[Supabase Server] Erreur création client :', error);
    return { supabase: null, error: 'Impossible de créer le client Supabase' };
  }
}
