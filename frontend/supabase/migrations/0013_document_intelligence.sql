-- Document intelligence foundation: parsed/indexed chunks, hybrid retrieval,
-- processing observability, and auditable document delivery actions.

create extension if not exists vector with schema extensions;

alter table documents
  add column if not exists visibility text not null default 'internal'
    check (visibility in ('internal', 'tenant', 'landlord', 'provider', 'shared')),
  add column if not exists processing_status text not null default 'uploaded'
    check (processing_status in ('uploaded', 'parsed', 'extracted', 'matched', 'reviewed', 'indexed', 'failed')),
  add column if not exists parsed_text text,
  add column if not exists parser_provider text,
  add column if not exists indexed_at timestamptz,
  add column if not exists content_hash text;

create index if not exists documents_workspace_status_idx
  on documents(workspace_id, status, processing_status);

create index if not exists documents_workspace_lot_idx
  on documents(workspace_id, lot_id)
  where lot_id is not null;

create index if not exists documents_workspace_tenant_idx
  on documents(workspace_id, tenant_id)
  where tenant_id is not null;

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_number integer,
  metadata jsonb not null default '{}',
  embedding extensions.vector(1536),
  embedding_model text,
  fts tsvector generated always as (to_tsvector('french', coalesce(content, ''))) stored,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index document_chunks_workspace_doc_idx
  on document_chunks(workspace_id, document_id);

create index document_chunks_fts_idx
  on document_chunks using gin(fts);

create index document_chunks_embedding_hnsw_idx
  on document_chunks using hnsw (embedding vector_cosine_ops)
  where embedding is not null;

alter table document_chunks enable row level security;

create policy "document_chunks_workspace" on document_chunks
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_chunks_workspace_insert" on document_chunks for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "document_chunks_workspace_update" on document_chunks for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_chunks_workspace_delete" on document_chunks for delete
  using (workspace_id in (select get_my_workspace_ids()));

create table document_processing_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  stage text not null check (stage in ('uploaded', 'parsed', 'extracted', 'matched', 'reviewed', 'indexed', 'delivery')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  provider text,
  model text,
  input jsonb not null default '{}',
  output jsonb not null default '{}',
  error text,
  attempts integer not null default 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index document_processing_jobs_workspace_status_idx
  on document_processing_jobs(workspace_id, status, stage, created_at desc);

create index document_processing_jobs_document_idx
  on document_processing_jobs(document_id, created_at desc);

alter table document_processing_jobs enable row level security;

create policy "document_processing_jobs_workspace" on document_processing_jobs
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_processing_jobs_workspace_insert" on document_processing_jobs for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "document_processing_jobs_workspace_update" on document_processing_jobs for update
  using (workspace_id in (select get_my_workspace_ids()));

create table document_deliveries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'portal', 'download', 'manual')),
  recipient_type text not null check (recipient_type in ('tenant', 'landlord', 'provider', 'agency', 'other')),
  recipient_id uuid,
  recipient_address text,
  status text not null default 'prepared' check (status in ('prepared', 'sent', 'failed')),
  message text,
  signed_url text,
  signed_url_expires_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index document_deliveries_workspace_document_idx
  on document_deliveries(workspace_id, document_id, created_at desc);

create index document_deliveries_recipient_idx
  on document_deliveries(workspace_id, recipient_type, recipient_id, created_at desc);

alter table document_deliveries enable row level security;

create policy "document_deliveries_workspace" on document_deliveries
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_deliveries_workspace_insert" on document_deliveries for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "document_deliveries_workspace_update" on document_deliveries for update
  using (workspace_id in (select get_my_workspace_ids()));

create or replace function search_document_chunks(
  search_workspace_id uuid,
  search_query text,
  search_embedding extensions.vector(1536) default null,
  match_count integer default 8,
  filter_tenant_id uuid default null,
  filter_lot_id uuid default null,
  include_pending boolean default false,
  full_text_weight double precision default 1.0,
  semantic_weight double precision default 1.0,
  rrf_k integer default 50
)
returns table (
  chunk_id uuid,
  document_id uuid,
  file_name text,
  doc_type text,
  status text,
  lot_id uuid,
  tenant_id uuid,
  page_number integer,
  content text,
  metadata jsonb,
  score double precision,
  source text
)
language sql
stable
as $$
  with candidate_chunks as (
    select c.*, d.file_name, d.doc_type, d.status, d.lot_id, d.tenant_id
    from document_chunks c
    join documents d on d.id = c.document_id
    where c.workspace_id = search_workspace_id
      and (include_pending or d.status = 'confirmed')
      and (
        filter_lot_id is null
        or d.lot_id = filter_lot_id
      )
      and (
        filter_tenant_id is null
        or d.tenant_id = filter_tenant_id
        or exists (
          select 1
          from document_tenants dt
          where dt.document_id = d.id
            and dt.tenant_id = filter_tenant_id
        )
      )
  ),
  full_text as (
    select
      c.id,
      row_number() over (
        order by ts_rank_cd(c.fts, websearch_to_tsquery('french', search_query)) desc
      ) as rank_ix
    from candidate_chunks c
    where nullif(trim(search_query), '') is not null
      and c.fts @@ websearch_to_tsquery('french', search_query)
    order by ts_rank_cd(c.fts, websearch_to_tsquery('french', search_query)) desc
    limit least(match_count, 30) * 2
  ),
  semantic as (
    select
      c.id,
      row_number() over (order by c.embedding <=> search_embedding) as rank_ix
    from candidate_chunks c
    where search_embedding is not null
      and c.embedding is not null
    order by c.embedding <=> search_embedding
    limit least(match_count, 30) * 2
  ),
  combined as (
    select
      coalesce(full_text.id, semantic.id) as id,
      coalesce(1.0 / (rrf_k + full_text.rank_ix), 0.0) * full_text_weight
        + coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * semantic_weight as combined_score,
      case
        when full_text.id is not null and semantic.id is not null then 'hybrid'
        when semantic.id is not null then 'semantic'
        else 'keyword'
      end as source
    from full_text
    full outer join semantic on semantic.id = full_text.id
  )
  select
    c.id as chunk_id,
    c.document_id,
    c.file_name,
    c.doc_type,
    c.status,
    c.lot_id,
    c.tenant_id,
    c.page_number,
    c.content,
    c.metadata,
    combined.combined_score as score,
    combined.source
  from combined
  join candidate_chunks c on c.id = combined.id
  order by combined.combined_score desc
  limit least(match_count, 30);
$$;

-- Scope storage access to the workspace encoded in the object path:
-- {workspace_id}/{yyyy-mm}/{source}/{filename}
create or replace function storage_object_workspace_id(object_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(object_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(object_name, '/', 1)::uuid
    else null
  end;
$$;

drop policy if exists "documents_storage_insert" on storage.objects;
drop policy if exists "documents_storage_select" on storage.objects;
drop policy if exists "documents_storage_delete" on storage.objects;

create policy "documents_storage_insert" on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and storage_object_workspace_id(name) in (select get_my_workspace_ids())
  );

create policy "documents_storage_select" on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and storage_object_workspace_id(name) in (select get_my_workspace_ids())
  );

create policy "documents_storage_delete" on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.role() = 'authenticated'
    and storage_object_workspace_id(name) in (select get_my_workspace_ids())
  );
