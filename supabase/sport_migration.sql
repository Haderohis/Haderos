-- Sport sessions
CREATE TABLE sport_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL,
  name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sport_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_sessions_user" ON sport_sessions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Exercises within a session
CREATE TABLE sport_exercises (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES sport_sessions(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('strength', 'cardio')),
  position int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sport_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_exercises_user" ON sport_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sport_sessions
      WHERE sport_sessions.id = sport_exercises.session_id
        AND sport_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sport_sessions
      WHERE sport_sessions.id = sport_exercises.session_id
        AND sport_sessions.user_id = auth.uid()
    )
  );

-- Sets within an exercise
CREATE TABLE sport_sets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id uuid REFERENCES sport_exercises(id) ON DELETE CASCADE NOT NULL,
  set_number int NOT NULL,
  reps int,
  weight_kg numeric(6,2),
  duration_seconds int,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sport_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sport_sets_user" ON sport_sets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM sport_exercises
      JOIN sport_sessions ON sport_sessions.id = sport_exercises.session_id
      WHERE sport_exercises.id = sport_sets.exercise_id
        AND sport_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sport_exercises
      JOIN sport_sessions ON sport_sessions.id = sport_exercises.session_id
      WHERE sport_exercises.id = sport_sets.exercise_id
        AND sport_sessions.user_id = auth.uid()
    )
  );
