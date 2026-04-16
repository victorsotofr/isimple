create or replace function get_my_workspace_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select workspace_id from workspace_members where user_id = auth.uid();
$$;

drop policy if exists "workspace_members_select" on workspace_members;
drop policy if exists "workspace_members_admin_all" on workspace_members;

create policy "workspace_members_select"
  on workspace_members for select
  using (workspace_id in (select get_my_workspace_ids()));

create policy "workspace_members_admin_all"
  on workspace_members for all
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "workspace_select_member" on workspaces;
drop policy if exists "workspace_update_admin" on workspaces;

create policy "workspace_select_member"
  on workspaces for select
  using (id in (select get_my_workspace_ids()));

create policy "workspace_update_admin"
  on workspaces for update
  using (
    id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );
