import type { SupabaseClient } from '@supabase/supabase-js';
import type { GmailConnection, Json } from '@/db';
import { absoluteUrl } from '@/lib/site';
import { decryptSecret, encryptSecret } from '@/lib/secret-crypto';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
] as const;

type GmailSupabase = SupabaseClient;

type GoogleTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
};

type GmailProfile = {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
};

type GmailHeader = {
  name: string;
  value: string;
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    headers?: GmailHeader[];
  };
};

type GmailThread = {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} manquant`);
  return value;
}

export function getGmailOAuthConfig() {
  return {
    clientId: requiredEnv('GOOGLE_CLIENT_ID'),
    clientSecret: requiredEnv('GOOGLE_CLIENT_SECRET'),
    redirectUri: process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim() || absoluteUrl('/api/gmail/callback'),
    scopes: [...GMAIL_SCOPES],
  };
}

export function buildGmailAuthUrl(state: string) {
  const config = getGmailOAuthConfig();
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: config.scopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function parseGoogleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error_description' in data
      ? String((data as { error_description: unknown }).error_description)
      : 'Erreur Google OAuth';
    throw new Error(message);
  }
  return data as T;
}

export async function exchangeCodeForTokens(code: string) {
  const config = getGmailOAuthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  return parseGoogleResponse<GoogleTokenResponse>(response);
}

export async function refreshGmailAccessToken(refreshToken: string) {
  const config = getGmailOAuthConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  return parseGoogleResponse<GoogleTokenResponse>(response);
}

export async function gmailRequest<T>(path: string, accessToken: string, init?: RequestInit) {
  const url = path.startsWith('https://')
    ? path
    : `https://gmail.googleapis.com/gmail/v1/users/me/${path.replace(/^\//, '')}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data && typeof data === 'object' && 'error' in data
      ? JSON.stringify((data as { error: unknown }).error)
      : `Erreur Gmail API (${response.status})`;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function getGmailProfile(accessToken: string) {
  return gmailRequest<GmailProfile>('profile', accessToken);
}

function headerValue(message: GmailMessage, headerName: string) {
  const headers = message.payload?.headers ?? [];
  return headers.find((header) => header.name.toLowerCase() === headerName.toLowerCase())?.value ?? '';
}

function parseAddress(value: string) {
  const match = value.match(/^(?:"?([^"]*)"?\s)?<?([^<>\s]+@[^<>\s]+)>?$/);
  if (!match) return { name: value, email: value };
  return {
    name: (match[1] || '').trim() || match[2],
    email: match[2],
  };
}

function parseDate(value: string | undefined, fallbackInternalDate?: string) {
  if (value) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }

  if (fallbackInternalDate) {
    const internal = new Date(Number(fallbackInternalDate));
    if (!Number.isNaN(internal.getTime())) return internal.toISOString();
  }

  return null;
}

export function normalizeGmailThread(
  thread: GmailThread,
  workspaceId: string,
  connectionId: string
) {
  const messages = thread.messages ?? [];
  const latest = messages[messages.length - 1];
  const from = latest ? parseAddress(headerValue(latest, 'From')) : { name: '', email: '' };
  const to = latest ? headerValue(latest, 'To') : '';
  const labels = Array.from(new Set(messages.flatMap((message) => message.labelIds ?? [])));

  return {
    workspace_id: workspaceId,
    gmail_connection_id: connectionId,
    thread_id: thread.id,
    message_id: latest?.id ?? null,
    from_email: from.email || null,
    from_name: from.name || null,
    to_emails: to ? to.split(',').map((item) => parseAddress(item.trim()).email).filter(Boolean) : [],
    subject: latest ? headerValue(latest, 'Subject') || '(Sans objet)' : '(Sans objet)',
    snippet: latest?.snippet || thread.snippet || '',
    received_at: latest ? parseDate(headerValue(latest, 'Date'), latest.internalDate) : null,
    labels,
    unread: labels.includes('UNREAD'),
    raw: thread as unknown as Json,
  };
}

export async function ensureValidGmailAccessToken(
  supabase: GmailSupabase,
  connection: GmailConnection
) {
  const currentToken = decryptSecret(connection.access_token_encrypted);
  const expiresAt = connection.expires_at ? new Date(connection.expires_at).getTime() : 0;
  const shouldRefresh = !expiresAt || expiresAt < Date.now() + 60_000;

  if (!shouldRefresh) return currentToken;
  if (!connection.refresh_token_encrypted) return currentToken;

  const refreshed = await refreshGmailAccessToken(decryptSecret(connection.refresh_token_encrypted));
  const encryptedAccessToken = encryptSecret(refreshed.access_token);
  const expires = refreshed.expires_in
    ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    : connection.expires_at;

  await supabase
    .from('gmail_connections')
    .update({
      access_token_encrypted: encryptedAccessToken,
      expires_at: expires,
      token_type: refreshed.token_type ?? connection.token_type,
      scope: refreshed.scope ? refreshed.scope.split(' ') : connection.scope,
      status: 'connected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  return refreshed.access_token;
}

function encodeHeader(value: string) {
  const clean = value.replace(/\r?\n/g, ' ').trim();
  return /[^\x00-\x7F]/.test(clean)
    ? `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`
    : clean;
}

function encodeRfc2822Message(to: string, subject: string, body: string) {
  const message = [
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    '',
    body,
  ].join('\r\n');

  return Buffer.from(message, 'utf8').toString('base64url');
}

export async function createGmailDraft({
  accessToken,
  to,
  subject,
  body,
  threadId,
}: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
}) {
  return gmailRequest<{ id: string; message: { id: string; threadId: string } }>('drafts', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        raw: encodeRfc2822Message(to, subject, body),
        ...(threadId ? { threadId } : {}),
      },
    }),
  });
}
