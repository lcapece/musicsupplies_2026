-- Add superuser staff member for testing Manager access control
-- This migration adds a test superuser account to the staff_management table

-- Add a superuser staff member
INSERT INTO staff_management (username, user_full_name, security_level, password_hash, settings, created_at, updated_at)
VALUES (
    'admin',
    'Super User Admin',
    'superuser',
    '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    '{}',
    NOW(),
    NOW()
)
ON CONFLICT (username)
DO UPDATE SET
    security_level = 'superuser',
    password_hash = '$2a$12$' || LEFT(encode(digest('password' || 'music_supplies_salt_2025', 'sha256'), 'hex'), 53),
    updated_at = NOW();

-- Add comment explaining the superuser role
COMMENT ON COLUMN staff_management.security_level IS 'Security level: superuser (Manager access), manager (department manager), staff (basic access)';
