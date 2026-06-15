CREATE TABLE presentiel_days (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  day_date   date        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_date)
);

ALTER TABLE presentiel_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_all" ON presentiel_days
  FOR ALL USING (auth.uid() = user_id);
