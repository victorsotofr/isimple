create table leases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lot_id uuid not null references lots(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  start_date date not null,
  end_date date,
  rent_amount numeric(10,2) not null,
  charges_amount numeric(10,2) not null default 0,
  deposit_amount numeric(10,2) not null default 0,
  status text not null default 'active' check (status in ('active','ended','pending')),
  created_at timestamptz not null default now()
);

alter table leases enable row level security;

create policy "workspace members can manage leases"
  on leases for all
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
