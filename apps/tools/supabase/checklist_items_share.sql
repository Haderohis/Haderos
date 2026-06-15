-- Ajout du partage sur checklist_items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false;

-- On remplace la policy CRUD unique par des policies séparées
DROP POLICY IF EXISTS "checklist_items_crud" ON checklist_items;

-- Propriétaire : CRUD complet sur ses propres items
CREATE POLICY "checklist_own_all" ON checklist_items
  FOR ALL USING (user_id = auth.uid());

-- Partenaire : SELECT sur les items partagés si partage accepté
CREATE POLICY "checklist_shared_select" ON checklist_items
  FOR SELECT USING (
    is_shared = true AND EXISTS (
      SELECT 1 FROM collection_shares cs
      WHERE cs.status = 'accepted'
        AND (
          (cs.owner_id = auth.uid()      AND cs.shared_with_id = checklist_items.user_id)
          OR (cs.shared_with_id = auth.uid() AND cs.owner_id    = checklist_items.user_id)
        )
    )
  );

-- Partenaire : UPDATE sur les items partagés (pour cocher/décocher)
CREATE POLICY "checklist_shared_update" ON checklist_items
  FOR UPDATE USING (
    is_shared = true AND EXISTS (
      SELECT 1 FROM collection_shares cs
      WHERE cs.status = 'accepted'
        AND (
          (cs.owner_id = auth.uid()      AND cs.shared_with_id = checklist_items.user_id)
          OR (cs.shared_with_id = auth.uid() AND cs.owner_id    = checklist_items.user_id)
        )
    )
  );
