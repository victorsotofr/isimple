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
