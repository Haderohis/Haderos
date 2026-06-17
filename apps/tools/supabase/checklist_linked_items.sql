-- Ajoute la colonne is_linked sur checklist_items
-- Quand true : cocher l'item le coche pour les deux personnes (done ET done_shared)
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS is_linked boolean DEFAULT false;

-- Permettre au partenaire de mettre à jour is_linked aussi
-- (la policy checklist_shared_update existante couvre déjà done_shared — on la remplace pour couvrir is_linked aussi)
DROP POLICY IF EXISTS checklist_shared_update ON checklist_items;
CREATE POLICY checklist_shared_update ON checklist_items
  FOR UPDATE USING (
    is_shared = true AND EXISTS (
      SELECT 1 FROM collection_shares
      WHERE status = 'accepted'
        AND (
          (owner_id = auth.uid() AND shared_with_id = checklist_items.user_id)
          OR (shared_with_id = auth.uid() AND owner_id = checklist_items.user_id)
        )
    )
  );
