import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/db';
import { AGENT_URL, agentJsonHeaders } from '@/app/api/agent/_utils';

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : null;
  const query = typeof body.query === 'string' ? body.query.trim() : '';
  if (!workspaceId || !query) {
    return NextResponse.json({ error: 'workspace_id et query sont requis' }, { status: 400 });
  }

  const { data: member } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const response = await fetch(`${AGENT_URL}/api/documents/search`, {
      method: 'POST',
      headers: agentJsonHeaders(),
      body: JSON.stringify({
        workspace_id: workspaceId,
        query,
        tenant_id: typeof body.tenant_id === 'string' ? body.tenant_id : null,
        lot_id: typeof body.lot_id === 'string' ? body.lot_id : null,
        include_pending: body.include_pending === true,
        match_count: typeof body.match_count === 'number' ? body.match_count : 8,
      }),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Recherche documentaire indisponible' }, { status: 503 });
  }
}
