-- Documents table for property management vault
create table documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  doc_type text not null default 'autre',
  status text not null default 'pending' check (status in ('pending', 'confirmed')),
  extracted_data jsonb,
  lot_id uuid references lots(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table documents enable row level security;

create policy "documents_workspace" on documents
  using (workspace_id in (select get_my_workspace_ids()));

create policy "documents_workspace_insert" on documents for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "documents_workspace_update" on documents for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "documents_workspace_delete" on documents for delete
  using (workspace_id in (select get_my_workspace_ids()));

-- Storage bucket for document files
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

create policy "documents_storage_insert" on storage.objects for insert
  with check (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_storage_select" on storage.objects for select
  using (bucket_id = 'documents' and auth.role() = 'authenticated');

create policy "documents_storage_delete" on storage.objects for delete
  using (bucket_id = 'documents' and auth.role() = 'authenticated');
