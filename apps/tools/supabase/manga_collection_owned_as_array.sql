-- Convertit owned_volumes de int vers int[] pour tracker les tomes individuellement
alter table manga_collection
  drop constraint if exists manga_collection_owned_volumes_check,
  alter column owned_volumes type int[] using ARRAY[owned_volumes];
