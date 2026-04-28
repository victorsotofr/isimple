import { NextResponse } from 'next/server';
import type { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import type { Database, Json } from '@/db';

type ServerSupabaseClient = ReturnType<typeof createServerClient<Database>>;

type WorkspaceSettings = {
  ai?: {
    provider?: string;
    model?: string;
  };
};

function asObject(value: Json | null | undefined): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
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
