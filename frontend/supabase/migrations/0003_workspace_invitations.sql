-- Migration 0003 : invitations à rejoindre un workspace

create table workspace_invitations (
  id            uuid        primary key default gen_random_uuid(),
  workspace_id  uuid        not null references workspaces(id) on delete cascade,
  email         text        not null,
  token         text        unique not null default encode(gen_random_bytes(32), 'hex'),
  role          text        not null default 'member' check (role in ('admin', 'member')),
  status        text        not null default 'pending' check (status in ('pending', 'accepted', 'expired')),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  created_at    timestamptz not null default now()
);

alter table workspace_invitations enable row level security;

-- Les admins du workspace voient les invitations
create policy "invitations_select_admin"
  on workspace_invitations for select
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Accès public à une invitation via token (filtré par token côté app)
-- Nécessaire pour que l'invité puisse voir l'invitation avant de se connecter
create policy "invitations_select_public_by_token"
  on workspace_invitations for select
  using (true);

-- Les admins créent des invitations
create policy "invitations_insert_admin"
  on workspace_invitations for insert
  with check (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Les admins peuvent mettre à jour (changer status)
create policy "invitations_update_admin"
  on workspace_invitations for update
  using (
    workspace_id in (
      select workspace_id from workspace_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Index sur le token pour les lookups d'acceptation
create index workspace_invitations_token_idx on workspace_invitations (token);
create index workspace_invitations_workspace_id_idx on workspace_invitations (workspace_id);
