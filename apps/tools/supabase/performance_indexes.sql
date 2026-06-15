-- Sport
CREATE INDEX IF NOT EXISTS idx_sport_sessions_user_date ON sport_sessions(user_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sport_exercises_session ON sport_exercises(session_id);

-- Calendar
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_date ON calendar_events(user_id, event_date DESC);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_owner_status ON calendar_shares(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_calendar_shares_recipient_status ON calendar_shares(shared_with_id, status);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON expenses(payer_id);
CREATE INDEX IF NOT EXISTS idx_expenses_debtor ON expenses(debtor_id);

-- Collection
CREATE INDEX IF NOT EXISTS idx_manga_collection_user ON manga_collection(user_id);
