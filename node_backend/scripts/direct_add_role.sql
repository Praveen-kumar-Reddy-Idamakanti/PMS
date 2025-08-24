-- Check if the role column exists
PRAGMA table_info(users);

-- Add the role column if it doesn't exist
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- Verify the column was added
PRAGMA table_info(users);

-- Update existing users to have the default role
UPDATE users SET role = 'user' WHERE role IS NULL;

-- Verify the data
SELECT id, email, role FROM users;
