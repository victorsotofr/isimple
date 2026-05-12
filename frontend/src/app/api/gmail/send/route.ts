import { NextRequest, NextResponse } from 'next/server';
import { ensureValidGmailAccessToken, sendGmailMessage } from '@/lib/gmail';
import { readGmailComposeRequest } from '@/app/api/gmail/_compose';
import { getOwnedGmailConnection, gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

export async function POST(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  let body: Awaited<ReturnType<typeof readGmailComposeRequest>>;
  try {
    body = await readGmailComposeRequest(request);
  } catch (e) {
    return gmailError(e instanceof Error ? e.message : 'Requête Gmail invalide');
  }

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
    const message = await sendGmailMessage({
      accessToken,
      to: body.to,
      subject: body.subject,
      body: body.body,
      threadId: body.thread_id,
      attachments: body.attachments,
    });

    return NextResponse.json({ message_id: message.id, thread_id: message.threadId });
  } catch (e) {
    console.error('[Gmail send]', e);
    return gmailError(e instanceof Error ? e.message : 'Envoi Gmail impossible', 500);
  }
}
