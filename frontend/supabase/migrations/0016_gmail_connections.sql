-- Gmail connection registry for manager-controlled mailbox intake.
-- Tokens are encrypted by the application before storage. Gmail actions remain
-- review-first: the MVP reads threads and creates drafts, but does not send.

create table gmail_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  scope text[] not null default '{}',
  token_type text,
  expires_at timestamptz,
  status text not null default 'connected' check (status in ('connected', 'revoked', 'error')),
  last_sync_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id, email)
);

create index gmail_connections_workspace_user_idx
  on gmail_connections(workspace_id, user_id);

alter table gmail_connections enable row level security;

create policy "gmail_connections_owner_select" on gmail_connections for select
  using (workspace_id in (select get_my_workspace_ids()) and user_id = auth.uid());

create policy "gmail_connections_owner_insert" on gmail_connections for insert
  with check (workspace_id in (select get_my_workspace_ids()) and user_id = auth.uid());

create policy "gmail_connections_owner_update" on gmail_connections for update
  using (workspace_id in (select get_my_workspace_ids()) and user_id = auth.uid());

create policy "gmail_connections_owner_delete" on gmail_connections for delete
  using (workspace_id in (select get_my_workspace_ids()) and user_id = auth.uid());

create table gmail_threads_cache (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  gmail_connection_id uuid not null references gmail_connections(id) on delete cascade,
  thread_id text not null,
  message_id text,
  from_email text,
  from_name text,
  to_emails text[] not null default '{}',
  subject text,
  snippet text,
  received_at timestamptz,
  labels text[] not null default '{}',
  unread boolean not null default false,
  raw jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gmail_connection_id, thread_id)
);

create index gmail_threads_cache_workspace_received_idx
  on gmail_threads_cache(workspace_id, received_at desc);

alter table gmail_threads_cache enable row level security;

create policy "gmail_threads_cache_workspace_select" on gmail_threads_cache for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "gmail_threads_cache_workspace_insert" on gmail_threads_cache for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "gmail_threads_cache_workspace_update" on gmail_threads_cache for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "gmail_threads_cache_workspace_delete" on gmail_threads_cache for delete
  using (workspace_id in (select get_my_workspace_ids()));
