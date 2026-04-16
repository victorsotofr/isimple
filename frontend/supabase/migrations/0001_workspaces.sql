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
