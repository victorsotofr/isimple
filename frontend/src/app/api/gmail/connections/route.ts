import { NextRequest, NextResponse } from 'next/server';
import { gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

export async function GET(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  if (!workspaceId) return gmailError('workspace_id requis');

  const allowed = await requireWorkspaceMember(context.supabase, context.user.id, workspaceId);
  if (!allowed) return gmailError('Accès workspace refusé', 403);

  const { data, error } = await context.supabase
    .from('gmail_connections')
    .select('id, workspace_id, user_id, email, scope, token_type, expires_at, status, last_sync_at, metadata, created_at, updated_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: true });

  if (error) return gmailError(error.message, 500);
  return NextResponse.json({ connections: data ?? [] });
}

export async function DELETE(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const body = await request.json().catch(() => null) as { workspace_id?: string; connection_id?: string } | null;
  if (!body?.workspace_id || !body.connection_id) return gmailError('workspace_id et connection_id requis');

  const allowed = await requireWorkspaceMember(context.supabase, context.user.id, body.workspace_id);
  if (!allowed) return gmailError('Accès workspace refusé', 403);

  const { error } = await context.supabase
    .from('gmail_connections')
    .update({ status: 'revoked', updated_at: new Date().toISOString() })
    .eq('id', body.connection_id)
    .eq('workspace_id', body.workspace_id)
    .eq('user_id', context.user.id);

  if (error) return gmailError(error.message, 500);
  return NextResponse.json({ ok: true });
}
