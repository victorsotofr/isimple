-- Junction table to link a document to one or more tenants (e.g. co-tenants on a bail).
-- documents.tenant_id is kept as a convenience "primary" pointer for legacy queries,
-- but the full list of associated tenants lives here.
create table document_tenants (
  document_id uuid not null references documents(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, tenant_id)
);

create index document_tenants_tenant_idx on document_tenants(tenant_id);
create index document_tenants_workspace_idx on document_tenants(workspace_id);

alter table document_tenants enable row level security;

create policy "document_tenants_workspace" on document_tenants
  using (workspace_id in (select get_my_workspace_ids()));

create policy "document_tenants_workspace_insert" on document_tenants for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "document_tenants_workspace_delete" on document_tenants for delete
  using (workspace_id in (select get_my_workspace_ids()));

-- Backfill: for every existing document that already has a tenant_id, create a junction row.
insert into document_tenants (document_id, tenant_id, workspace_id)
select id, tenant_id, workspace_id
from documents
where tenant_id is not null
on conflict do nothing;
