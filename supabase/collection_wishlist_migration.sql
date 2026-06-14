CREATE TABLE collection_wishlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Mangas',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE collection_wishlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wishlist_crud_own" ON collection_wishlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
