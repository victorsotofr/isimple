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

type GmailBody = {
  data?: string;
  size?: number;
  attachmentId?: string;
};

type GmailPart = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPart[];
};

type GmailMessage = {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: {
    mimeType?: string;
    headers?: GmailHeader[];
    body?: GmailBody;
    parts?: GmailPart[];
  };
};

type GmailThread = {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
};

type NormalizedGmailMessage = {
  id: string;
  message_id: string;
  rfc_message_id: string | null;
  references: string | null;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  received_at: string | null;
  labels: string[];
  unread: boolean;
  direction: 'incoming' | 'outgoing';
};

export type GmailAttachmentInput = {
  filename: string;
  mimeType: string;
  content: Buffer;
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

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity: string) => {
    if (entity.startsWith('#x')) {
      return String.fromCharCode(Number.parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCharCode(Number.parseInt(entity.slice(1), 10));
    }
    return named[entity] ?? match;
  });
}

function stripHtml(html: string) {
  return decodeHtmlEntities(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function decodeBodyData(data?: string) {
  if (!data) return '';
  return Buffer.from(data, 'base64url').toString('utf8');
}

function collectBodyParts(part: GmailPart | NonNullable<GmailMessage['payload']> | undefined) {
  if (!part) return { plain: [] as string[], html: [] as string[] };

  const body = decodeBodyData(part.body?.data);
  const mimeType = part.mimeType?.toLowerCase() ?? '';
  const result = {
    plain: [] as string[],
    html: [] as string[],
  };

  if (body && mimeType.startsWith('text/plain')) {
    result.plain.push(decodeHtmlEntities(body).trim());
  } else if (body && mimeType.startsWith('text/html')) {
    result.html.push(stripHtml(body));
  }

  for (const child of part.parts ?? []) {
    const childBodies = collectBodyParts(child);
    result.plain.push(...childBodies.plain);
    result.html.push(...childBodies.html);
  }

  return result;
}

function extractMessageBody(message: GmailMessage | undefined) {
  const bodies = collectBodyParts(message?.payload);
  const text = (bodies.plain.find(Boolean) ?? bodies.html.find(Boolean) ?? '').trim();
  return text.slice(0, 16_000);
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

function stripReplyPrefix(value: string) {
  return value.replace(/^\s*(re|fw|fwd)\s*:\s*/i, '').trim();
}

function normalizeGmailMessage(message: GmailMessage, accountEmail?: string): NormalizedGmailMessage {
  const from = parseAddress(headerValue(message, 'From'));
  const to = headerValue(message, 'To');
  const labels = message.labelIds ?? [];
  const account = accountEmail?.toLowerCase();
  const direction = (account ? from.email.toLowerCase() === account : false) || labels.includes('SENT')
    ? 'outgoing'
    : 'incoming';
  const snippet = message.snippet || '';

  return {
    id: message.id,
    message_id: message.id,
    rfc_message_id: headerValue(message, 'Message-ID') || null,
    references: headerValue(message, 'References') || null,
    from_email: from.email || null,
    from_name: from.name || null,
    to_emails: to ? to.split(',').map((item) => parseAddress(item.trim()).email).filter(Boolean) : [],
    subject: decodeHtmlEntities(headerValue(message, 'Subject') || '(Sans objet)'),
    snippet: decodeHtmlEntities(snippet),
    body_text: extractMessageBody(message),
    received_at: parseDate(headerValue(message, 'Date'), message.internalDate),
    labels,
    unread: labels.includes('UNREAD'),
    direction,
  };
}

export function normalizeGmailThread(
  thread: GmailThread,
  workspaceId: string,
  connectionId: string,
  accountEmail?: string
) {
  const messages = thread.messages ?? [];
  const normalizedMessages = messages.map(message => normalizeGmailMessage(message, accountEmail));
  const latest = normalizedMessages[normalizedMessages.length - 1];
  const first = normalizedMessages[0];
  const latestIncoming = [...normalizedMessages].reverse().find(message => message.direction === 'incoming');
  const participant = latestIncoming ?? first ?? latest;
  const labels = Array.from(new Set(normalizedMessages.flatMap((message) => message.labels)));
  const snippet = latest?.snippet || thread.snippet || '';
  const displaySubject = stripReplyPrefix(first?.subject || latest?.subject || '(Sans objet)') || '(Sans objet)';

  return {
    workspace_id: workspaceId,
    gmail_connection_id: connectionId,
    thread_id: thread.id,
    message_id: latest?.message_id ?? null,
    from_email: participant?.from_email ?? null,
    from_name: participant?.from_name ?? null,
    reply_to_email: latestIncoming?.from_email ?? participant?.from_email ?? null,
    reply_to_name: latestIncoming?.from_name ?? participant?.from_name ?? null,
    to_emails: latest?.to_emails ?? [],
    subject: displaySubject,
    snippet: decodeHtmlEntities(snippet),
    body_text: latest?.body_text ?? null,
    received_at: latest?.received_at ?? null,
    labels,
    unread: normalizedMessages.some(message => message.direction === 'incoming' && message.unread),
    messages: normalizedMessages,
    raw: {
      id: thread.id,
      snippet: decodeHtmlEntities(thread.snippet ?? ''),
      messages: normalizedMessages.map((message) => ({
        id: message.id,
        rfc_message_id: message.rfc_message_id,
        labelIds: message.labels,
        received_at: message.received_at,
        direction: message.direction,
      })),
    } as unknown as Json,
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

function foldBase64(value: string) {
  return value.match(/.{1,76}/g)?.join('\r\n') ?? value;
}

function encodeAttachmentFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\\r\n]/g, '_')
    .trim() || 'attachment';
}

function sanitizeThreadHeader(value?: string | null) {
  return value?.replace(/\r?\n/g, ' ').trim() || '';
}

function encodeRfc2822Message({
  to,
  subject,
  body,
  attachments = [],
  replyToMessageId,
  references,
}: {
  to: string;
  subject: string;
  body: string;
  attachments?: GmailAttachmentInput[];
  replyToMessageId?: string | null;
  references?: string | null;
}) {
  const replyHeader = sanitizeThreadHeader(replyToMessageId);
  const referencesHeader = sanitizeThreadHeader(references);
  const headers = [
    `To: ${encodeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    ...(replyHeader ? [`In-Reply-To: ${replyHeader}`] : []),
    ...(replyHeader || referencesHeader ? [`References: ${[referencesHeader, replyHeader].filter(Boolean).join(' ')}`] : []),
    'MIME-Version: 1.0',
  ];

  if (attachments.length === 0) {
    const message = [
      ...headers,
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 8bit',
      '',
      body,
    ].join('\r\n');

    return Buffer.from(message, 'utf8').toString('base64url');
  }

  const boundary = `isimple_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const parts = [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body,
    '',
    ...attachments.flatMap((attachment) => {
      const filename = encodeAttachmentFilename(attachment.filename);
      return [
        `--${boundary}`,
        `Content-Type: ${attachment.mimeType || 'application/octet-stream'}; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-Disposition: attachment; filename="${filename}"`,
        '',
        foldBase64(attachment.content.toString('base64')),
        '',
      ];
    }),
    `--${boundary}--`,
    '',
  ];

  return Buffer.from(parts.join('\r\n'), 'utf8').toString('base64url');
}

export async function createGmailDraft({
  accessToken,
  to,
  subject,
  body,
  threadId,
  replyToMessageId,
  references,
  attachments = [],
}: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
  replyToMessageId?: string | null;
  references?: string | null;
  attachments?: GmailAttachmentInput[];
}) {
  return gmailRequest<{ id: string; message: { id: string; threadId: string } }>('drafts', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      message: {
        raw: encodeRfc2822Message({ to, subject, body, attachments, replyToMessageId, references }),
        ...(threadId ? { threadId } : {}),
      },
    }),
  });
}

export async function sendGmailMessage({
  accessToken,
  to,
  subject,
  body,
  threadId,
  replyToMessageId,
  references,
  attachments = [],
}: {
  accessToken: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string | null;
  replyToMessageId?: string | null;
  references?: string | null;
  attachments?: GmailAttachmentInput[];
}) {
  return gmailRequest<{ id: string; threadId: string; labelIds?: string[] }>('messages/send', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      raw: encodeRfc2822Message({ to, subject, body, attachments, replyToMessageId, references }),
      ...(threadId ? { threadId } : {}),
    }),
  });
}
