create or replace function is_workspace_admin(ws_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists(
    select 1 from workspace_members
    where workspace_id = ws_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "workspace_members_select" on workspace_members;
drop policy if exists "workspace_members_admin_all" on workspace_members;

create policy "workspace_members_select"
  on workspace_members for select
  using (user_id = auth.uid() or workspace_id in (select get_my_workspace_ids()));

create policy "workspace_members_admin_write"
  on workspace_members for insert
  with check (is_workspace_admin(workspace_id));

create policy "workspace_members_admin_update"
  on workspace_members for update
  using (is_workspace_admin(workspace_id));

create policy "workspace_members_admin_delete"
  on workspace_members for delete
  using (is_workspace_admin(workspace_id));
