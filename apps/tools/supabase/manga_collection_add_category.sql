alter table manga_collection
  add column if not exists category text not null default 'Mangas';
