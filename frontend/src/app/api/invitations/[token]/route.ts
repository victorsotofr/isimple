import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase';

const tokenSchema = z.string().min(16).max(128);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const parsed = tokenSchema.safeParse(token);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }

    const admin = getServiceSupabase();
    const { data: invitation, error } = await admin
      .from('workspace_invitations')
      .select('id, email, role, status, expires_at, workspaces(name)')
      .eq('token', parsed.data)
      .single();

    if (error || !invitation) {
      return NextResponse.json({ error: 'Invitation introuvable' }, { status: 404 });
    }

    if (invitation.status === 'pending' && new Date(invitation.expires_at) < new Date()) {
      await admin
        .from('workspace_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id);

      return NextResponse.json(
        { error: 'Cette invitation a expiré', status: 'expired' },
        { status: 410 }
      );
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        {
          error: invitation.status === 'expired'
            ? 'Cette invitation a expiré'
            : 'Cette invitation a déjà été utilisée',
          status: invitation.status,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('[GET /api/invitations/:token]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
