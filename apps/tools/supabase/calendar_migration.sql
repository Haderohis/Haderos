-- Tables pour le calendrier partagé
-- calendar_shares doit être créée avant calendar_events (référencée dans une policy)

CREATE TABLE calendar_shares (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shared_with_id uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, shared_with_id)
);

ALTER TABLE calendar_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_select" ON calendar_shares
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "owner_insert" ON calendar_shares
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "owner_delete" ON calendar_shares
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "recipient_select" ON calendar_shares
  FOR SELECT USING (auth.uid() = shared_with_id);

CREATE POLICY "recipient_update" ON calendar_shares
  FOR UPDATE USING (auth.uid() = shared_with_id);

CREATE POLICY "recipient_delete" ON calendar_shares
  FOR DELETE USING (auth.uid() = shared_with_id);

-- calendar_events après calendar_shares
CREATE TABLE calendar_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title        text        NOT NULL,
  event_date   date        NOT NULL,
  start_time   time        NULL,
  color        text        NULL,
  is_shared    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_all" ON calendar_events
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "shared_read" ON calendar_events
  FOR SELECT USING (
    is_shared = true AND
    EXISTS (
      SELECT 1 FROM calendar_shares
      WHERE owner_id = calendar_events.user_id
        AND shared_with_id = auth.uid()
        AND status = 'accepted'
    )
  );
