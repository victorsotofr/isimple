-- Migration 0002 : membres des workspaces

create table workspace_members (
  workspace_id  uuid  not null references workspaces(id) on delete cascade,
  user_id       uuid  not null references auth.users(id) on delete cascade,
  role          text  not null default 'member' check (role in ('admin', 'member')),
  created_at    timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table workspace_members enable row level security;

-- Un membre voit les autres membres de son workspace
create policy "workspace_members_select"
  on workspace_members for select
  using (
    workspace_id in (
      select workspace_id from workspace_members where user_id = auth.uid()
    )
  );

-- Seul un admin peut gérer les membres (insert/update/delete)
create policy "workspace_members_admin_all"
  on workspace_members for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Index pour les lookups fréquents
create index workspace_members_user_id_idx on workspace_members (user_id);

-- Workspace policies (deferred here because they reference workspace_members)
create policy "workspace_select_member"
  on workspaces for select
  using (
    id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace_update_admin"
  on workspaces for update
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );
