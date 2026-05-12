-- Provider-neutral registry for managed vector stores and mirrored document files.
-- Supabase remains the relational source of truth; OpenAI Vector Stores own
-- unstructured RAG retrieval for the MVP.

create table workspace_vector_stores (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null check (provider in ('openai', 'pinecone', 'supabase')),
  scope text not null default 'workspace' check (scope in ('workspace', 'tenant', 'lot')),
  scope_id uuid,
  name text not null,
  external_id text,
  status text not null default 'pending' check (status in ('pending', 'ready', 'syncing', 'failed', 'deleted')),
  usage_bytes bigint,
  metadata jsonb not null default '{}',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index workspace_vector_stores_workspace_scope_null_uidx
  on workspace_vector_stores(workspace_id, provider, scope)
  where scope_id is null;

create unique index workspace_vector_stores_workspace_scope_id_uidx
  on workspace_vector_stores(workspace_id, provider, scope, scope_id)
  where scope_id is not null;

create index workspace_vector_stores_external_idx
  on workspace_vector_stores(provider, external_id)
  where external_id is not null;

alter table workspace_vector_stores enable row level security;

create policy "workspace_vector_stores_workspace" on workspace_vector_stores
  using (workspace_id in (select get_my_workspace_ids()));

create policy "workspace_vector_stores_workspace_insert" on workspace_vector_stores for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "workspace_vector_stores_workspace_update" on workspace_vector_stores for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "workspace_vector_stores_workspace_delete" on workspace_vector_stores for delete
  using (workspace_id in (select get_my_workspace_ids()));

create table document_external_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  workspace_vector_store_id uuid not null references workspace_vector_stores(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  provider text not null check (provider in ('openai', 'pinecone', 'supabase')),
  external_file_id text,
  external_vector_file_id text,
  status text not null default 'queued' check (status in ('queued', 'uploading', 'indexed', 'failed', 'deleted')),
  attributes jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_vector_store_id, document_id)
);

create index document_external_files_workspace_document_idx
  on document_external_files(workspace_id, document_id);

create index document_external_files_provider_idx
  on document_external_files(provider, external_file_id, external_vector_file_id);

alter table document_external_files enable row level security;

create policy "document_external_files_workspace" on document_external_files
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_external_files_workspace_insert" on document_external_files for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "document_external_files_workspace_update" on document_external_files for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_external_files_workspace_delete" on document_external_files for delete
  using (workspace_id in (select get_my_workspace_ids()));
