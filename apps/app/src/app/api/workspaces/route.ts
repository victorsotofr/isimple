import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import { z } from 'zod';

const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Le nom doit faire au moins 2 caractères').max(100),
});

// Génère un slug à partir du nom + suffixe aléatoire pour unicité
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
}

export async function POST(request: NextRequest) {
  try {
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
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createWorkspaceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const { name } = parsed.data;
    const slug = generateSlug(name);

    const admin = getServiceSupabase();

    // Crée le workspace
    const { data: workspace, error: wsError } = await admin
      .from('workspaces')
      .insert({ name, slug, created_by: user.id })
      .select()
      .single();

    if (wsError) {
      console.error('[POST /api/workspaces] Erreur création workspace :', wsError);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    // Ajoute le créateur comme admin
    const { error: memberError } = await admin
      .from('workspace_members')
      .insert({ workspace_id: workspace.id, user_id: user.id, role: 'admin' });

    if (memberError) {
      console.error('[POST /api/workspaces] Erreur ajout membre :', memberError);
      // Nettoyage : supprime le workspace orphelin
      await admin.from('workspaces').delete().eq('id', workspace.id);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workspaces] Erreur :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
