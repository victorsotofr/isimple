import { NextRequest } from 'next/server';
import type { GmailAttachmentInput } from '@/lib/gmail';
import { getServiceSupabase } from '@/lib/supabase';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type GmailComposeRequestBody = {
  workspace_id: string;
  connection_id: string;
  to: string;
  subject: string;
  body: string;
  thread_id?: string;
  reply_message_id?: string;
  references?: string;
  document_ids: string[];
  attachments: GmailAttachmentInput[];
};

function formValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isFileEntry(value: FormDataEntryValue): value is File {
  return typeof value !== 'string' && typeof value.arrayBuffer === 'function';
}

async function readAttachments(form: FormData) {
  const files = form.getAll('attachments').filter(isFileEntry);
  const total = files.reduce((sum, file) => sum + file.size, 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    throw new Error('Pièces jointes trop lourdes. Maximum 20 Mo par email.');
  }

  return Promise.all(files.map(async (file) => ({
    filename: file.name || 'attachment',
    mimeType: file.type || 'application/octet-stream',
    content: Buffer.from(await file.arrayBuffer()),
  })));
}

function formValues(form: FormData, key: string) {
  return form.getAll(key).filter((value): value is string => typeof value === 'string').map(value => value.trim()).filter(Boolean);
}

function normalizeOutgoingEmailBody(value: string) {
  return value
    .split('\n')
    .filter(line => !/^\s*\(?sources?\s*:/i.test(line.trim()))
    .join('\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([^\n])\n(Cordialement,?|Bien à vous,?|Bonne journée,?)/i, '$1\n\n$2')
    .trim();
}

function jsonStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
}

export async function loadGmailDocumentAttachments(workspaceId: string, documentIds: string[]) {
  const uniqueDocumentIds = Array.from(new Set(documentIds)).filter(Boolean);
  if (uniqueDocumentIds.length === 0) return [];

  const admin = getServiceSupabase();
  const { data: docs, error } = await admin
    .from('documents')
    .select('id, file_name, file_path, workspace_id')
    .eq('workspace_id', workspaceId)
    .in('id', uniqueDocumentIds);

  if (error) throw new Error('Documents introuvables pour les pièces jointes.');

  const foundIds = new Set((docs ?? []).map(doc => doc.id));
  const missing = uniqueDocumentIds.filter(id => !foundIds.has(id));
  if (missing.length > 0) throw new Error('Certains documents ne sont plus accessibles.');

  const attachments = await Promise.all((docs ?? []).map(async (doc) => {
    const { data, error: downloadError } = await admin.storage.from('documents').download(doc.file_path);
    if (downloadError || !data) throw new Error(`Téléchargement impossible : ${doc.file_name}`);
    const content = Buffer.from(await data.arrayBuffer());
    return {
      filename: doc.file_name,
      mimeType: data.type || 'application/pdf',
      content,
    } satisfies GmailAttachmentInput;
  }));

  const total = attachments.reduce((sum, attachment) => sum + attachment.content.byteLength, 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    throw new Error('Documents trop lourds. Maximum 20 Mo par email.');
  }

  return attachments;
}

export function assertGmailAttachmentBudget(attachments: GmailAttachmentInput[]) {
  const total = attachments.reduce((sum, attachment) => sum + attachment.content.byteLength, 0);
  if (total > MAX_ATTACHMENT_BYTES) {
    throw new Error('Pièces jointes trop lourdes. Maximum 20 Mo par email.');
  }
}

export async function readGmailComposeRequest(request: NextRequest): Promise<GmailComposeRequestBody | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return {
      workspace_id: formValue(form, 'workspace_id'),
      connection_id: formValue(form, 'connection_id'),
      to: formValue(form, 'to'),
      subject: formValue(form, 'subject'),
      body: normalizeOutgoingEmailBody(formValue(form, 'body')),
      thread_id: formValue(form, 'thread_id') || undefined,
      reply_message_id: formValue(form, 'reply_message_id') || undefined,
      references: formValue(form, 'references') || undefined,
      document_ids: formValues(form, 'document_ids'),
      attachments: await readAttachments(form),
    };
  }

  const body = await request.json().catch(() => null) as Partial<GmailComposeRequestBody> | null;
  if (!body) return null;
  return {
    workspace_id: typeof body.workspace_id === 'string' ? body.workspace_id.trim() : '',
    connection_id: typeof body.connection_id === 'string' ? body.connection_id.trim() : '',
    to: typeof body.to === 'string' ? body.to.trim() : '',
    subject: typeof body.subject === 'string' ? body.subject.trim() : '',
    body: typeof body.body === 'string' ? normalizeOutgoingEmailBody(body.body) : '',
    thread_id: typeof body.thread_id === 'string' ? body.thread_id.trim() : undefined,
    reply_message_id: typeof body.reply_message_id === 'string' ? body.reply_message_id.trim() : undefined,
    references: typeof body.references === 'string' ? body.references.trim() : undefined,
    document_ids: jsonStringArray(body.document_ids),
    attachments: [],
  };
}
