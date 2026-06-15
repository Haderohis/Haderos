-- Table des partages de collection
create table if not exists collection_shares (
  id              uuid        primary key default gen_random_uuid(),
  owner_id        uuid        references auth.users(id) on delete cascade not null,
  shared_with_id  uuid        references auth.users(id) on delete cascade not null,
  status          text        not null default 'pending'
                              check (status in ('pending', 'accepted', 'declined')),
  created_at      timestamptz default now() not null,
  unique (owner_id, shared_with_id)
);

alter table collection_shares enable row level security;

-- L'owner peut créer et voir ses partages
create policy "owner_select" on collection_shares for select using (auth.uid() = owner_id);
create policy "owner_insert" on collection_shares for insert with check (auth.uid() = owner_id);
create policy "owner_delete" on collection_shares for delete using (auth.uid() = owner_id);

-- Le destinataire peut voir et accepter/refuser
create policy "recipient_select" on collection_shares for select using (auth.uid() = shared_with_id);
create policy "recipient_update" on collection_shares for update using (auth.uid() = shared_with_id);

-- Colonne data sur notifications (métadonnées: share_id, owner_id, etc.)
alter table notifications add column if not exists data jsonb;

-- Permettre au destinataire d'un partage accepté de lire la collection
create policy "shared_collection_read" on manga_collection
  for select using (
    exists (
      select 1 from collection_shares
      where owner_id = manga_collection.user_id
        and shared_with_id = auth.uid()
        and status = 'accepted'
    )
  );
