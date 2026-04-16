import { createBrowserClient } from '@supabase/ssr';

let client: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Client Supabase côté navigateur.
 * Singleton pour éviter de créer plusieurs instances GoTrue.
 */
export function createClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    // Pendant le build/SSG, les vars d'env peuvent ne pas être dispo
    console.warn('[Supabase Browser] Variables manquantes — client placeholder retourné');
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-key'
    );
  }

  client = createBrowserClient(url, key);
  return client;
}
