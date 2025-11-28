-- Add is_salesperson column to staff_management table
-- This migration adds a boolean column to identify which staff members are salespeople

-- Add the is_salesperson column with default false
ALTER TABLE staff_management 
ADD COLUMN is_salesperson BOOLEAN DEFAULT false;

-- Update existing staff members who are known salespeople based on the documentation
-- From STAFF_ACCOUNTS_RECOVERED.md, these are the sales staff accounts:
UPDATE staff_management 
SET is_salesperson = true 
WHERE username IN ('guy', 'anthony', 'julissa', 'joe', 'melissa');

-- Also mark louis as a salesperson since he's a super_admin who likely does sales
UPDATE staff_management 
SET is_salesperson = true 
WHERE username = 'louis';

-- Add comment to the column
COMMENT ON COLUMN staff_management.is_salesperson IS 'Indicates if this staff member is a salesperson who can be assigned to territories';