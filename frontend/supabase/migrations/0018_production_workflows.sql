-- Production workflow layer: ticket deadlines/source metadata, compliance
-- checklist items, notifications, and workspace audit events.

drop policy if exists "invitations_select_public_by_token" on workspace_invitations;

create index if not exists workspace_invitations_workspace_email_status_idx
  on workspace_invitations(workspace_id, lower(email), status);

alter table tickets
  add column if not exists due_at timestamptz,
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'inbox', 'gmail', 'document', 'system')),
  add column if not exists source_ref text,
  add column if not exists ai_summary text,
  add column if not exists responsibility text
    check (responsibility in ('tenant', 'landlord', 'provider', 'unknown'));

create index if not exists tickets_workspace_due_idx
  on tickets(workspace_id, due_at)
  where due_at is not null;

create index if not exists tickets_workspace_source_idx
  on tickets(workspace_id, source);

alter table ticket_events
  drop constraint if exists ticket_events_event_type_check;

alter table ticket_events
  add constraint ticket_events_event_type_check
  check (event_type in (
    'created',
    'status_changed',
    'priority_changed',
    'provider_changed',
    'due_date_changed',
    'assignment_changed',
    'ai_suggestion',
    'note'
  ));

create table compliance_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  lot_id uuid references lots(id) on delete cascade,
  lease_id uuid references leases(id) on delete cascade,
  document_id uuid references documents(id) on delete set null,
  item_type text not null,
  label text not null,
  status text not null default 'missing'
    check (status in ('missing', 'pending_review', 'complete', 'waived')),
  due_at timestamptz,
  notes text,
  metadata jsonb not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (lot_id is not null or lease_id is not null)
);

create index compliance_items_workspace_status_idx
  on compliance_items(workspace_id, status, due_at);

create index compliance_items_lot_idx
  on compliance_items(lot_id, item_type);

create index compliance_items_lease_idx
  on compliance_items(lease_id, item_type);

alter table compliance_items enable row level security;

create policy "compliance_items_workspace_select" on compliance_items for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "compliance_items_workspace_insert" on compliance_items for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "compliance_items_workspace_update" on compliance_items for update
  using (workspace_id in (select get_my_workspace_ids()));

create policy "compliance_items_workspace_delete" on compliance_items for delete
  using (workspace_id in (select get_my_workspace_ids()));

create table notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  body text,
  status text not null default 'unread'
    check (status in ('unread', 'read', 'dismissed')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  action_href text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index notifications_workspace_user_status_idx
  on notifications(workspace_id, user_id, status, created_at desc);

alter table notifications enable row level security;

create policy "notifications_workspace_select" on notifications for select
  using (
    workspace_id in (select get_my_workspace_ids())
    and (user_id is null or user_id = auth.uid())
  );

create policy "notifications_workspace_insert" on notifications for insert
  with check (workspace_id in (select get_my_workspace_ids()));

create policy "notifications_workspace_update" on notifications for update
  using (
    workspace_id in (select get_my_workspace_ids())
    and (user_id is null or user_id = auth.uid())
  );

create table audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  entity_type text not null,
  entity_id text,
  summary text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index audit_events_workspace_created_idx
  on audit_events(workspace_id, created_at desc);

create index audit_events_entity_idx
  on audit_events(workspace_id, entity_type, entity_id);

alter table audit_events enable row level security;

create policy "audit_events_workspace_select" on audit_events for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "audit_events_workspace_insert" on audit_events for insert
  with check (workspace_id in (select get_my_workspace_ids()));
