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
