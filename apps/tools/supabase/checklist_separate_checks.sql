-- Ajout de la coche partenaire sur checklist_items
ALTER TABLE checklist_items ADD COLUMN IF NOT EXISTS done_shared boolean DEFAULT false;
