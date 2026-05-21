import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getServiceSupabase } from '@/lib/supabase';

const createInvitationSchema = z.object({
  email: z.string().email().max(254).transform(value => value.trim().toLowerCase()),
  role: z.enum(['admin', 'member']).default('member'),
});

const updateInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  status: z.literal('expired'),
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
    .maybeSingle();

  if (!member || member.role !== 'admin') {
    return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }

  return { user, admin };
}

async function recordAudit(
  admin: ReturnType<typeof getServiceSupabase>,
  event: {
    workspaceId: string;
    actorUserId: string;
    eventType: string;
    entityType: string;
    entityId?: string | null;
    summary: string;
    metadata?: Record<string, unknown>;
  }
) {
  const { error } = await admin.from('audit_events').insert({
    workspace_id: event.workspaceId,
    actor_user_id: event.actorUserId,
    event_type: event.eventType,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    summary: event.summary,
    metadata: event.metadata ?? {},
  });

  if (error) {
    console.warn('[audit_events] write skipped', error.message);
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(id);
    if ('error' in auth) return auth.error;

    const { data, error } = await auth.admin
      .from('workspace_invitations')
      .select('id, email, role, status, token, expires_at, created_at')
      .eq('workspace_id', id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[GET /api/workspaces/:id/invitations]', error);
      return NextResponse.json({ error: 'Erreur lors du chargement des invitations' }, { status: 500 });
    }

    return NextResponse.json({ invitations: data ?? [] });
  } catch (error) {
    console.error('[GET /api/workspaces/:id/invitations]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(id);
    if ('error' in auth) return auth.error;

    const parsed = createInvitationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Paramètres invalides' },
        { status: 400 }
      );
    }

    const { data: existing, error: existingError } = await auth.admin
      .from('workspace_invitations')
      .select('id, email, role, status, token, expires_at, created_at')
      .eq('workspace_id', id)
      .eq('email', parsed.data.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (existingError) {
      console.error('[POST /api/workspaces/:id/invitations] lookup', existingError);
      return NextResponse.json({ error: 'Erreur lors de la vérification' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ invitation: existing, reused: true });
    }

    const { data: invitation, error } = await auth.admin
      .from('workspace_invitations')
      .insert({
        workspace_id: id,
        email: parsed.data.email,
        role: parsed.data.role,
      })
      .select('id, email, role, status, token, expires_at, created_at')
      .single();

    if (error || !invitation) {
      console.error('[POST /api/workspaces/:id/invitations]', error);
      return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 });
    }

    await recordAudit(auth.admin, {
      workspaceId: id,
      actorUserId: auth.user.id,
      eventType: 'workspace_invitation_created',
      entityType: 'workspace_invitation',
      entityId: invitation.id,
      summary: `Invitation créée pour ${invitation.email}`,
      metadata: { role: invitation.role },
    });

    return NextResponse.json({ invitation, reused: false }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/workspaces/:id/invitations]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAdmin(id);
    if ('error' in auth) return auth.error;

    const parsed = updateInvitationSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Paramètres invalides' },
        { status: 400 }
      );
    }

    const { data: invitation, error } = await auth.admin
      .from('workspace_invitations')
      .update({ status: parsed.data.status })
      .eq('workspace_id', id)
      .eq('id', parsed.data.invitation_id)
      .eq('status', 'pending')
      .select('id, email, role, status, token, expires_at, created_at')
      .single();

    if (error || !invitation) {
      console.error('[PATCH /api/workspaces/:id/invitations]', error);
      return NextResponse.json({ error: "Invitation introuvable ou déjà traitée" }, { status: 404 });
    }

    await recordAudit(auth.admin, {
      workspaceId: id,
      actorUserId: auth.user.id,
      eventType: 'workspace_invitation_expired',
      entityType: 'workspace_invitation',
      entityId: invitation.id,
      summary: `Invitation expirée pour ${invitation.email}`,
      metadata: { role: invitation.role },
    });

    return NextResponse.json({ invitation });
  } catch (error) {
    console.error('[PATCH /api/workspaces/:id/invitations]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
