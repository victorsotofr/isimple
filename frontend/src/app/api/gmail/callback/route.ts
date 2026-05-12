import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForTokens, getGmailProfile, GMAIL_SCOPES } from '@/lib/gmail';
import { encryptSecret, verifySignedPayload } from '@/lib/secret-crypto';
import { gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

type GmailOAuthState = {
  workspace_id: string;
  user_id: string;
  nonce: string;
  created_at: number;
};

function redirectInbox(request: NextRequest, status: 'connected' | 'error', message?: string) {
  const url = new URL('/inbox', request.url);
  url.searchParams.set('gmail', status);
  if (message) url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const error = request.nextUrl.searchParams.get('error');
  if (error) return redirectInbox(request, 'error', 'Connexion Gmail annulée');

  const code = request.nextUrl.searchParams.get('code');
  const stateParam = request.nextUrl.searchParams.get('state');
  if (!code || !stateParam) return gmailError('Callback OAuth incomplet');

  try {
    const state = verifySignedPayload<GmailOAuthState>(stateParam);
    const freshState = typeof state.created_at === 'number' && Date.now() - state.created_at < 10 * 60_000;
    if (!freshState || state.user_id !== context.user.id) {
      return gmailError('State OAuth expiré ou invalide', 403);
    }

    const allowed = await requireWorkspaceMember(context.supabase, context.user.id, state.workspace_id);
    if (!allowed) return gmailError('Accès workspace refusé', 403);

    const tokens = await exchangeCodeForTokens(code);
    const profile = await getGmailProfile(tokens.access_token);
    const email = profile.emailAddress;

    const { data: existing } = await context.supabase
      .from('gmail_connections')
      .select('refresh_token_encrypted')
      .eq('workspace_id', state.workspace_id)
      .eq('user_id', context.user.id)
      .eq('email', email)
      .maybeSingle();

    const encryptedRefreshToken = tokens.refresh_token
      ? encryptSecret(tokens.refresh_token)
      : existing?.refresh_token_encrypted ?? null;

    const now = new Date().toISOString();
    const { error: upsertError } = await context.supabase
      .from('gmail_connections')
      .upsert({
        workspace_id: state.workspace_id,
        user_id: context.user.id,
        email,
        access_token_encrypted: encryptSecret(tokens.access_token),
        ...(encryptedRefreshToken ? { refresh_token_encrypted: encryptedRefreshToken } : {}),
        scope: tokens.scope ? tokens.scope.split(' ') : [...GMAIL_SCOPES],
        token_type: tokens.token_type ?? 'Bearer',
        expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
        status: 'connected',
        metadata: {
          messages_total: profile.messagesTotal ?? null,
          threads_total: profile.threadsTotal ?? null,
        },
        last_sync_at: null,
        updated_at: now,
      }, { onConflict: 'workspace_id,user_id,email' });

    if (upsertError) throw new Error(upsertError.message);

    return redirectInbox(request, 'connected');
  } catch (e) {
    console.error('[Gmail OAuth callback]', e);
    return redirectInbox(request, 'error', 'Connexion Gmail impossible');
  }
}
