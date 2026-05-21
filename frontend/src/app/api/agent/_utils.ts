import { NextResponse } from 'next/server';
import type { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Database, Json } from '@/db';

type ServerSupabaseClient = ReturnType<typeof createServerClient<Database>>;

export const AGENT_URL = process.env.AGENT_URL ?? process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:8000';

type WorkspaceSettings = {
  ai?: {
    provider?: string;
    model?: string;
  };
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? true
    : false;
}

function asObject(value: Json | null | undefined): Record<string, unknown> {
  return isPlainObject(value) ? value : {};
}

export function agentJsonHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = process.env.AGENT_INTERNAL_TOKEN;
  if (token) headers['X-Agent-Token'] = token;
  return headers;
}

function readAISettings(settings: Json | null | undefined): WorkspaceSettings['ai'] {
  const root = asObject(settings);
  const ai = asObject(root.ai as Json | null | undefined);
  return {
    provider: typeof ai.provider === 'string' ? ai.provider : undefined,
    model: typeof ai.model === 'string' ? ai.model : undefined,
  };
}

export async function requireUser(
  supabase: ServerSupabaseClient
): Promise<{ user: User } | { response: NextResponse }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  return { user };
}

export async function requireWorkspaceMembership(
  supabase: ServerSupabaseClient,
  userId: string,
  workspaceId: string | null
): Promise<{ workspaceId: string } | { response: NextResponse }> {
  if (!workspaceId) {
    return { response: NextResponse.json({ error: 'workspace_id requis' }, { status: 400 }) };
  }

  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[agent] workspace membership check failed:', error);
    return { response: NextResponse.json({ error: 'Vérification workspace impossible' }, { status: 500 }) };
  }

  if (!data) {
    return { response: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) };
  }

  return { workspaceId };
}

export async function withWorkspaceAISettings(
  supabase: ServerSupabaseClient,
  body: Record<string, unknown>
) {
  const workspaceId = typeof body.workspace_id === 'string' ? body.workspace_id : null;
  if (!workspaceId) return body;

  const { data } = await supabase
    .from('workspaces')
    .select('settings')
    .eq('id', workspaceId)
    .single();

  const settings = (data as { settings: Json } | null)?.settings;
  const ai = readAISettings(settings);
  return {
    ...body,
    ai_provider: body.ai_provider ?? ai?.provider,
    ai_model: body.ai_model ?? ai?.model,
  };
}
