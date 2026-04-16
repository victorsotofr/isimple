create table workspaces (
  id          uuid        primary key default gen_random_uuid(),
  slug        text        unique not null,
  name        text        not null,
  plan        text        not null default 'free',
  created_by  uuid        not null references auth.users(id),
  created_at  timestamptz not null default now(),
  settings    jsonb       not null default '{}'
);

alter table workspaces enable row level security;
-- Policies added in 0002 after workspace_members exists
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
create table lots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  address text not null,
  city text not null,
  postal_code text not null,
  type text not null check (type in ('apartment','house','studio','parking','commercial','other')),
  area_m2 numeric(6,2),
  rent_amount numeric(10,2) not null,
  charges_amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table lots enable row level security;

create policy "workspace members can manage lots"
  on lots for all
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
create table tenants (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now()
);

alter table tenants enable row level security;

create policy "workspace members can manage tenants"
  on tenants for all
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
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  content text not null,
  role text not null check (role in ('tenant','manager','ai')),
  is_ai_draft boolean not null default false,
  created_at timestamptz not null default now()
);

alter table messages enable row level security;

create policy "workspace members can manage messages"
  on messages for all
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

-- Keep last_message_at on conversations in sync
create or replace function update_conversation_last_message_at()
returns trigger language plpgsql security definer as $$
begin
  update conversations set last_message_at = now() where id = new.conversation_id;
  return new;
end;
$$;

create trigger trg_messages_update_conversation
  after insert on messages
  for each row execute function update_conversation_last_message_at();
