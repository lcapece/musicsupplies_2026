-- Add AI grading and focus fields to prospector
ALTER TABLE prospector
  ADD COLUMN IF NOT EXISTS ai_grade text,
  ADD COLUMN IF NOT EXISTS ai_grade_reason text,
  ADD COLUMN IF NOT EXISTS ai_music_focus boolean;
