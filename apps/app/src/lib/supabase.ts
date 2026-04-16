import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createBrowserClient } from './supabase-browser';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client côté navigateur — singleton via @supabase/ssr (cookie-based auth)
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient()
  : (() => {
      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Supabase] Variables manquantes côté serveur — client placeholder');
        return createSupabaseClient(
          'https://placeholder.supabase.co',
          'placeholder-key'
        );
      }
      return createSupabaseClient(supabaseUrl, supabaseAnonKey);
    })();

/**
 * Client Service Role — lecture/écriture admin sans RLS.
 * À utiliser UNIQUEMENT dans les API routes serveur, jamais côté client.
 * Filtre toujours sur workspace_id extrait du JWT pour respecter le multi-tenant.
 */
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('[Supabase] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant');
    throw new Error('Erreur configuration serveur : credentials Supabase manquants');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
