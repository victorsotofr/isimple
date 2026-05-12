import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import type {
  DocumentDeliveryChannel,
  DocumentDeliveryStatus,
  DocumentRecipientType,
} from '@/db';

const CHANNELS: DocumentDeliveryChannel[] = ['email', 'sms', 'whatsapp', 'portal', 'download', 'manual'];
const RECIPIENT_TYPES: DocumentRecipientType[] = ['tenant', 'landlord', 'provider', 'agency', 'other'];
const STATUSES: DocumentDeliveryStatus[] = ['prepared', 'sent', 'failed'];

async function getUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cs: Array<{ name: string; value: string; options?: CookieOptions }>) =>
          cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    }
  );
  return supabase.auth.getUser();
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const channel = CHANNELS.includes(body.channel) ? body.channel as DocumentDeliveryChannel : 'download';
  const recipientType = RECIPIENT_TYPES.includes(body.recipient_type)
    ? body.recipient_type as DocumentRecipientType
    : 'agency';
  const status = STATUSES.includes(body.status) ? body.status as DocumentDeliveryStatus : 'prepared';
  const recipientId = typeof body.recipient_id === 'string' ? body.recipient_id : null;
  const recipientAddress = typeof body.recipient_address === 'string' ? body.recipient_address : null;
  const message = typeof body.message === 'string' ? body.message : null;

  const admin = getServiceSupabase();
  const { data: doc } = await admin
    .from('documents')
    .select('id, workspace_id, file_path, file_name, status')
    .eq('id', id)
    .single();
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  const { data: member } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', doc.workspace_id)
    .eq('user_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  if (doc.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'Le document doit être confirmé avant d’être envoyé.' },
      { status: 409 }
    );
  }

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const { data: signedData, error: signedError } = await admin.storage
    .from('documents')
    .createSignedUrl(doc.file_path, 3600);
  if (signedError || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Impossible de préparer le lien du document' }, { status: 500 });
  }

  const { data: delivery, error } = await admin
    .from('document_deliveries')
    .insert({
      workspace_id: doc.workspace_id,
      document_id: doc.id,
      channel,
      recipient_type: recipientType,
      recipient_id: recipientId,
      recipient_address: recipientAddress,
      status,
      message,
      signed_url: signedData.signedUrl,
      signed_url_expires_at: expiresAt.toISOString(),
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    delivery,
    document: {
      id: doc.id,
      file_name: doc.file_name,
    },
    signed_url: signedData.signedUrl,
    signed_url_expires_at: expiresAt.toISOString(),
  }, { status: 201 });
}
