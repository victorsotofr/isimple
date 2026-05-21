import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/db';
import {
  AGENT_URL,
  agentJsonHeaders,
  isPlainObject,
  requireUser,
  requireWorkspaceMembership,
  withWorkspaceAISettings,
} from '../_utils';

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

  const auth = await requireUser(supabase);
  if ('response' in auth) return auth.response;

  try {
    const body = await request.json().catch(() => null);
    if (!isPlainObject(body)) {
      return NextResponse.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : null;
    const membership = await requireWorkspaceMembership(supabase, auth.user.id, workspaceId);
    if ('response' in membership) return membership.response;

    const payload = await withWorkspaceAISettings(supabase, body);
    const response = await fetch(`${AGENT_URL}/api/classify`, {
      method: 'POST',
      headers: agentJsonHeaders(),
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: 'Agent indisponible' }, { status: 503 });
  }
}
