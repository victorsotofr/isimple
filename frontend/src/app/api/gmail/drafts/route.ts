import { NextRequest, NextResponse } from 'next/server';
import { createGmailDraft, ensureValidGmailAccessToken } from '@/lib/gmail';
import { getOwnedGmailConnection, gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';
import { assertGmailAttachmentBudget, loadGmailDocumentAttachments, readGmailComposeRequest } from '@/app/api/gmail/_compose';

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
    const documentAttachments = await loadGmailDocumentAttachments(body.workspace_id, body.document_ids);
    const attachments = [...body.attachments, ...documentAttachments];
    assertGmailAttachmentBudget(attachments);
    const draft = await createGmailDraft({
      accessToken,
      to: body.to,
      subject: body.subject,
      body: body.body,
      threadId: body.thread_id,
      replyToMessageId: body.reply_message_id,
      references: body.references,
      attachments,
    });

    return NextResponse.json({ draft_id: draft.id, message: draft.message });
  } catch (e) {
    console.error('[Gmail draft]', e);
    return gmailError(e instanceof Error ? e.message : 'Création du brouillon Gmail impossible', 500);
  }
}
