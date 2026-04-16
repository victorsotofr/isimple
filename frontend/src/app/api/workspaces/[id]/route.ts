import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
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

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const admin = getServiceSupabase();

    // Verify user is admin of this workspace
    const { data: member } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', id)
      .eq('user_id', user.id)
      .single();

    if (!member || member.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
    }

    // Verify user has other workspaces (cannot delete last one)
    const { data: memberships } = await admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', user.id);

    if ((memberships ?? []).length <= 1) {
      return NextResponse.json(
        { error: 'Impossible de supprimer votre seul workspace' },
        { status: 400 }
      );
    }

    // Delete workspace (cascade deletes members, lots, tenants, leases, etc.)
    const { error } = await admin.from('workspaces').delete().eq('id', id);
    if (error) {
      console.error('[DELETE /api/workspaces/:id]', error);
      return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[DELETE /api/workspaces/:id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
