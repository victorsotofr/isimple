import { NextRequest, NextResponse } from 'next/server';
import { buildGmailAuthUrl } from '@/lib/gmail';
import { signPayload } from '@/lib/secret-crypto';
import { gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

function redirectInbox(request: NextRequest, message: string) {
  const url = new URL('/inbox', request.url);
  url.searchParams.set('gmail', 'error');
  url.searchParams.set('message', message);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return gmailError('workspace_id requis');

  const allowed = await requireWorkspaceMember(context.supabase, context.user.id, workspaceId);
  if (!allowed) return gmailError('Accès workspace refusé', 403);

  try {
    const state = signPayload({
      workspace_id: workspaceId,
      user_id: context.user.id,
      nonce: crypto.randomUUID(),
      created_at: Date.now(),
    });

    return NextResponse.redirect(buildGmailAuthUrl(state));
  } catch (error) {
    console.error('[Gmail OAuth connect]', error);
    return redirectInbox(request, 'Configuration Gmail invalide');
  }
}
