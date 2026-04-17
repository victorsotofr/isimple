import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await req.json();
  const admin = getServiceSupabase();

  // Split tenant_ids out of the update payload — it targets the junction table.
  const { tenant_ids, ...docUpdates } = body as { tenant_ids?: string[] } & Record<string, unknown>;

  // Keep documents.tenant_id aligned with the first entry of tenant_ids (legacy "primary").
  if (Array.isArray(tenant_ids)) {
    docUpdates.tenant_id = tenant_ids[0] ?? null;
  }

  const { data, error } = await admin
    .from('documents')
    .update({ ...docUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (Array.isArray(tenant_ids)) {
    await admin.from('document_tenants').delete().eq('document_id', id);
    if (tenant_ids.length > 0) {
      const { error: linkErr } = await admin.from('document_tenants').insert(
        tenant_ids.map(tenantId => ({
          document_id: id,
          tenant_id: tenantId,
          workspace_id: data.workspace_id,
        }))
      );
      if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 500 });
    }
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { data: { user } } = await getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const admin = getServiceSupabase();

  // Get file_path before deleting to remove from storage
  const { data: doc } = await admin.from('documents').select('file_path').eq('id', id).single();

  const { error } = await admin.from('documents').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (doc?.file_path) {
    await admin.storage.from('documents').remove([doc.file_path]);
  }

  return NextResponse.json({ success: true });
}
