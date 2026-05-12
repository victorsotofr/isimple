import { NextRequest, NextResponse } from 'next/server';
import { ensureValidGmailAccessToken, gmailRequest, normalizeGmailThread } from '@/lib/gmail';
import { getOwnedGmailConnection, gmailError, requireGmailRouteContext, requireWorkspaceMember } from '@/app/api/gmail/_utils';

type GmailThreadListResponse = {
  threads?: Array<{ id: string; threadId: string }>;
  nextPageToken?: string;
  resultSizeEstimate?: number;
};

export async function GET(request: NextRequest) {
  const context = await requireGmailRouteContext();
  if ('response' in context) return context.response;

  const workspaceId = request.nextUrl.searchParams.get('workspace_id');
  const connectionId = request.nextUrl.searchParams.get('connection_id');
  const q = request.nextUrl.searchParams.get('q') || 'in:inbox newer_than:30d';
  if (!workspaceId) return gmailError('workspace_id requis');

  const allowed = await requireWorkspaceMember(context.supabase, context.user.id, workspaceId);
  if (!allowed) return gmailError('Accès workspace refusé', 403);

  const connection = await getOwnedGmailConnection(context.supabase, context.user.id, workspaceId, connectionId);
  if (!connection) return NextResponse.json({ threads: [], connections_required: true });

  try {
    const accessToken = await ensureValidGmailAccessToken(context.supabase, connection);
    const params = new URLSearchParams({
      maxResults: '12',
      q,
    });
    const list = await gmailRequest<GmailThreadListResponse>(`threads?${params.toString()}`, accessToken);
    const threadRefs = list.threads ?? [];

    const normalized = await Promise.all(threadRefs.map(async (thread) => {
      const details = await gmailRequest<Parameters<typeof normalizeGmailThread>[0]>(
        `threads/${thread.id}?format=full`,
        accessToken
      );
      return normalizeGmailThread(details, workspaceId, connection.id, connection.email);
    }));

    if (normalized.length > 0) {
      await context.supabase
        .from('gmail_threads_cache')
        .upsert(
          normalized.map((thread) => ({
            workspace_id: thread.workspace_id,
            gmail_connection_id: thread.gmail_connection_id,
            thread_id: thread.thread_id,
            message_id: thread.message_id,
            from_email: thread.from_email,
            from_name: thread.from_name,
            to_emails: thread.to_emails,
            subject: thread.subject,
            snippet: thread.snippet,
            received_at: thread.received_at,
            labels: thread.labels,
            unread: thread.unread,
            raw: thread.raw,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'gmail_connection_id,thread_id' }
        );
    }

    await context.supabase
      .from('gmail_connections')
      .update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', connection.id);

    return NextResponse.json({
      connection: {
        id: connection.id,
        email: connection.email,
      },
      threads: normalized.map((thread) => ({
        id: thread.thread_id,
        thread_id: thread.thread_id,
        message_id: thread.message_id,
        from_email: thread.from_email,
        from_name: thread.from_name,
        reply_to_email: thread.reply_to_email,
        reply_to_name: thread.reply_to_name,
        to_emails: thread.to_emails,
        subject: thread.subject,
        snippet: thread.snippet,
        body_text: thread.body_text,
        received_at: thread.received_at,
        labels: thread.labels,
        unread: thread.unread,
        messages: thread.messages,
      })),
    });
  } catch (e) {
    console.error('[Gmail threads]', e);
    return gmailError(e instanceof Error ? e.message : 'Lecture Gmail impossible', 500);
  }
}
