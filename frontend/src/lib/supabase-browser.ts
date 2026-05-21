import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  getSupabaseAuthStorageKeys,
  isInvalidRefreshTokenError,
  isSupabaseAuthStorageName,
} from './supabase-auth';

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

export function clearSupabaseBrowserAuthStorage() {
  if (typeof document === 'undefined') return;

  const cookieNames = document.cookie
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(Boolean)
    .filter(name => isSupabaseAuthStorageName(name));

  const names = new Set([...getSupabaseAuthStorageKeys(), ...cookieNames]);
  names.forEach(name => {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  });

  if (typeof window !== 'undefined') {
    names.forEach(name => {
      window.localStorage.removeItem(name);
      window.sessionStorage.removeItem(name);
    });
  }
}

export async function clearSupabaseBrowserSession(supabaseClient: SupabaseClient) {
  clearSupabaseBrowserAuthStorage();
  try {
    await supabaseClient.auth.signOut({ scope: 'local' });
  } catch {
    clearSupabaseBrowserAuthStorage();
  }
}

export async function getAuthenticatedUser(supabaseClient: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    if (isInvalidRefreshTokenError(error)) {
      await clearSupabaseBrowserSession(supabaseClient);
    }
    return null;
  }

  return data.user ?? null;
}
