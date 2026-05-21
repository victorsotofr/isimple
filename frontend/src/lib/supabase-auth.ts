const INVALID_REFRESH_TOKEN_CODES = new Set([
  'refresh_token_not_found',
  'refresh_token_already_used',
]);

function getErrorValue(error: unknown, key: string) {
  if (!error || typeof error !== 'object') return null;
  const value = (error as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : null;
}

export function isInvalidRefreshTokenError(error: unknown) {
  const code = getErrorValue(error, 'code') ?? getErrorValue(error, 'error_code');
  if (code && INVALID_REFRESH_TOKEN_CODES.has(code)) return true;

  const message = getErrorValue(error, 'message') ?? '';
  return /invalid refresh token|refresh token not found|refresh token already used/i.test(message);
}

export function getSupabaseAuthStorageKey(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  if (!supabaseUrl) return null;

  try {
    const hostname = new URL(supabaseUrl).hostname;
    const projectRef = hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export function getSupabaseAuthStorageKeys(supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const storageKey = getSupabaseAuthStorageKey(supabaseUrl);
  if (!storageKey) return [];

  return [storageKey, `${storageKey}-code-verifier`, `${storageKey}-user`];
}

export function isSupabaseAuthStorageName(name: string, supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  return getSupabaseAuthStorageKeys(supabaseUrl).some(
    key => name === key || name.startsWith(`${key}.`)
  );
}
