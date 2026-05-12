import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { GmailConnection } from '@/db';
import { requireUser } from '@/app/api/agent/_utils';
import { createServerClient } from '@/lib/supabase-server';

export type GmailRouteContext = {
  supabase: SupabaseClient;
  user: User;
};

export function gmailError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireGmailRouteContext(): Promise<GmailRouteContext | { response: NextResponse }> {
  const { supabase, error } = await createServerClient();
  if (!supabase) return { response: gmailError(error ?? 'Supabase indisponible', 500) };

  const auth = await requireUser(supabase);
  if ('response' in auth) return { response: auth.response };

  return { supabase, user: auth.user };
}

export async function requireWorkspaceMember(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string
) {
  const { data } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data);
}

export async function getOwnedGmailConnection(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  connectionId?: string | null
): Promise<GmailConnection | null> {
  let query = supabase
    .from('gmail_connections')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'connected')
    .order('created_at', { ascending: true })
    .limit(1);

  if (connectionId) query = query.eq('id', connectionId);

  const { data } = await query.maybeSingle();
  return data as GmailConnection | null;
}
