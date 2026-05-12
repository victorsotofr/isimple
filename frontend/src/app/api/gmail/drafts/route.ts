import { NextRequest, NextResponse } from 'next/server';
import { createGmailDraft, ensureValidGmailAccessToken } from '@/lib/gmail';
import { getOwnedGmailConnection, gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

export async function POST(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const body = await request.json().catch(() => null) as {
    workspace_id?: string;
    connection_id?: string;
    to?: string;
    subject?: string;
    body?: string;
    thread_id?: string;
  } | null;

  if (!body?.workspace_id || !body.connection_id || !body.to || !body.subject || !body.body) {
    return gmailError('workspace_id, connection_id, to, subject et body requis');
  }

  const allowed = await requireWorkspaceMember(context.supabase, context.user.id, body.workspace_id);
  if (!allowed) return gmailError('Accès workspace refusé', 403);

  const connection = await getOwnedGmailConnection(
    context.supabase,
    context.user.id,
    body.workspace_id,
    body.connection_id
  );
  if (!connection) return gmailError('Connexion Gmail introuvable', 404);

  try {
    const accessToken = await ensureValidGmailAccessToken(context.supabase, connection);
    const draft = await createGmailDraft({
      accessToken,
      to: body.to,
      subject: body.subject,
      body: body.body,
      threadId: body.thread_id,
    });

    return NextResponse.json({ draft_id: draft.id, message: draft.message });
  } catch (e) {
    console.error('[Gmail draft]', e);
    return gmailError(e instanceof Error ? e.message : 'Création du brouillon Gmail impossible', 500);
  }
}
