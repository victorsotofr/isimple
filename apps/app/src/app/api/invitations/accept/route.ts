import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceSupabase } from '@/lib/supabase';
import { z } from 'zod';

const acceptSchema = z.object({
  token: z.string().min(1),
});

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
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 400 });
    }

    const { token } = parsed.data;
    const admin = getServiceSupabase();

    // Récupère l'invitation
    const { data: invitation, error: fetchError } = await admin
      .from('workspace_invitations')
      .select('id, workspace_id, email, status, expires_at')
      .eq('token', token)
      .single();

    if (fetchError || !invitation) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ error: 'Cette invitation a déjà été utilisée ou a expiré' }, { status: 400 });
    }

    if (new Date(invitation.expires_at) < new Date()) {
      await admin
        .from('workspace_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);
      return NextResponse.json({ error: 'Cette invitation a expiré' }, { status: 400 });
    }

    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return NextResponse.json({ error: "Cette invitation n'est pas destinée à votre compte" }, { status: 403 });
    }

    // Vérifie si déjà membre
    const { data: existing } = await admin
      .from('workspace_members')
      .select('user_id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', user.id)
      .single();

    if (!existing) {
      const { error: memberError } = await admin
        .from('workspace_members')
        .insert({ workspace_id: invitation.workspace_id, user_id: user.id, role: 'member' });

      if (memberError) {
        console.error('[POST /api/invitations/accept] Erreur ajout membre :', memberError);
        return NextResponse.json({ error: 'Erreur lors de l\'acceptation' }, { status: 500 });
      }
    }

    // Marque l'invitation comme acceptée
    await admin
      .from('workspace_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation.id);

    return NextResponse.json({ workspace_id: invitation.workspace_id });
  } catch (error) {
    console.error('[POST /api/invitations/accept] Erreur :', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
