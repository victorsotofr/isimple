import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import { z } from 'zod';

const aiSettingsSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'gemini']).optional(),
  model: z.string().max(120).optional(),
}).optional();

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  settings: z.object({
    ai: aiSettingsSchema,
    onboarding: z.record(z.string(), z.unknown()).optional(),
  }).passthrough().optional(),
});

async function requireAdmin(workspaceId: string) {
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
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };

  const admin = getServiceSupabase();
  const { data: member } = await admin
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();

  if (!member || member.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }

  return { user, admin };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(id);
    if ('error' in auth) return auth.error;

    const body = await req.json();
    const parsed = updateWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Paramètres invalides' },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.name) update.name = parsed.data.name;
    if (parsed.data.settings) update.settings = parsed.data.settings;

    const { data: workspace, error } = await auth.admin
      .from('workspaces')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[PATCH /api/workspaces/:id]', error);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({ workspace });
  } catch (e) {
    console.error('[PATCH /api/workspaces/:id]', e);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(id);
    if ('error' in auth) return auth.error;

    // Verify user has other workspaces (cannot delete last one)
    const { data: memberships } = await auth.admin
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', auth.user.id);

    if ((memberships ?? []).length <= 1) {
      return NextResponse.json(
        { error: 'Impossible de supprimer votre seul workspace' },
        { status: 400 }
      );
    }

    // Delete workspace (cascade deletes members, lots, tenants, leases, etc.)
    const { error } = await auth.admin.from('workspaces').delete().eq('id', id);
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
