-- Permet au destinataire de supprimer un partage (quitter le partage)
create policy "recipient_delete" on collection_shares
  for delete using (auth.uid() = shared_with_id);
