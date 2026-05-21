create table providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null,
  specialty text not null default 'Général',
  company text,
  email text,
  phone text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index providers_workspace_name_idx
  on providers(workspace_id, name);

alter table providers enable row level security;

create policy "providers_workspace_select" on providers for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "providers_workspace_insert" on providers for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "providers_workspace_update" on providers for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "providers_workspace_delete" on providers for delete
  using (workspace_id in (select get_my_workspace_ids()));

create table tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lot_id uuid references lots(id) on delete set null,
  tenant_id uuid references tenants(id) on delete set null,
  provider_id uuid references providers(id) on delete set null,
  title text not null,
  description text,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting_provider', 'resolved', 'closed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_workspace_status_idx
  on tickets(workspace_id, status, updated_at desc);

create index tickets_lot_idx
  on tickets(lot_id);

create index tickets_provider_idx
  on tickets(provider_id);

alter table tickets enable row level security;

create policy "tickets_workspace_select" on tickets for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "tickets_workspace_insert" on tickets for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "tickets_workspace_update" on tickets for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "tickets_workspace_delete" on tickets for delete
  using (workspace_id in (select get_my_workspace_ids()));

create table ticket_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  ticket_id uuid not null references tickets(id) on delete cascade,
  event_type text not null default 'note'
    check (event_type in ('created', 'status_changed', 'priority_changed', 'provider_changed', 'note')),
  title text not null,
  body text,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ticket_events_ticket_created_idx
  on ticket_events(ticket_id, created_at desc);

create index ticket_events_workspace_idx
  on ticket_events(workspace_id);

alter table ticket_events enable row level security;

create policy "ticket_events_workspace_select" on ticket_events for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "ticket_events_workspace_insert" on ticket_events for insert
  with check (workspace_id in (select get_my_workspace_ids()));
