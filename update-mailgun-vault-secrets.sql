-- Update Mailgun secrets in Supabase Vault
-- Run this in Supabase SQL Editor

-- Delete existing Mailgun secrets (if any) to avoid duplicates
DELETE FROM vault.secrets WHERE name LIKE 'MAILGUN%';

-- Insert new Mailgun secrets
INSERT INTO vault.secrets (name, secret)
VALUES
  ('MAILGUN_PUBLIC_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
  ('MAILGUN_API_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
  ('MAILGUN_SMTP_USER', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'),
  ('MAILGUN_SMTP', 'smtp.mailgun.org'),
  ('MAILGUN_SENDING_KEY', 'XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');

-- Verify the secrets were added
SELECT name, created_at FROM vault.secrets WHERE name LIKE 'MAILGUN%';
