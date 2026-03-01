ALTER TABLE risk_assessments
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS priority_score integer;
