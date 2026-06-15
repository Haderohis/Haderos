-- is_shared signifie maintenant "participe" et non "visible"
-- Tous les events sont visibles par le partenaire qui partage le calendrier

DROP POLICY IF EXISTS "shared_read" ON calendar_events;

CREATE POLICY "shared_read" ON calendar_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM calendar_shares
      WHERE owner_id = calendar_events.user_id
        AND shared_with_id = auth.uid()
        AND status = 'accepted'
    )
  );
