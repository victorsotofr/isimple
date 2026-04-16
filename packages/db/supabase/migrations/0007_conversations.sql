create table conversations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  tenant_id uuid references tenants(id) on delete set null,
  lease_id uuid references leases(id) on delete set null,
  subject text not null,
  category text not null default 'autre'
    check (category in ('maintenance','paiement','réclamation','document','information','autre')),
  status text not null default 'open' check (status in ('open','closed','pending')),
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

alter table conversations enable row level security;

create policy "workspace members can manage conversations"
  on conversations for all
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  )
  with check (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );
