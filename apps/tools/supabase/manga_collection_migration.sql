create table if not exists manga_collection (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        references auth.users(id) on delete cascade not null,
  mal_id        int         not null,
  title         text        not null,
  total_volumes int,
  owned_volumes int         not null check (owned_volumes >= 0),
  cover_url     text,
  created_at    timestamptz default now()   not null,
  unique (user_id, mal_id)
);

alter table manga_collection enable row level security;

create policy "select" on manga_collection for select using (auth.uid() = user_id);
create policy "insert" on manga_collection for insert with check (auth.uid() = user_id);
create policy "update" on manga_collection for update using (auth.uid() = user_id);
create policy "delete" on manga_collection for delete using (auth.uid() = user_id);
