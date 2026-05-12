import { NextRequest } from 'next/server';
import type { GmailAttachmentInput } from '@/lib/gmail';

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

export type GmailComposeRequestBody = {
  workspace_id: string;
  connection_id: string;
  to: string;
  subject: string;
  body: string;
  thread_id?: string;
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

export async function readGmailComposeRequest(request: NextRequest): Promise<GmailComposeRequestBody | null> {
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    return {
      workspace_id: formValue(form, 'workspace_id'),
      connection_id: formValue(form, 'connection_id'),
      to: formValue(form, 'to'),
      subject: formValue(form, 'subject'),
      body: formValue(form, 'body'),
      thread_id: formValue(form, 'thread_id') || undefined,
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
    body: typeof body.body === 'string' ? body.body.trim() : '',
    thread_id: typeof body.thread_id === 'string' ? body.thread_id.trim() : undefined,
    attachments: [],
  };
}
