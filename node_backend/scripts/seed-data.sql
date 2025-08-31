-- Disable foreign key checks temporarily
PRAGMA foreign_keys = OFF;

-- Clear existing data (be careful with this in production!)
-- Uncomment these lines to clear existing data if needed
-- DELETE FROM user_activity;
-- DELETE FROM admin_settings;
-- DELETE FROM users;

-- Insert sample users (will skip if email already exists)
INSERT OR IGNORE INTO users (name, email, password, employee_id, role, is_active, created_at, updated_at) VALUES
('Alice Johnson', 'alice@example.com', '$2b$10$XFDJ3Xy8kX7s5J8Z5V5xJeUJYJvX8Qd9pX8J9vX9X9X9X9X9X9X9', 'EMP001', 'admin', 1, datetime('now'), datetime('now')),
('Bob Smith', 'bob@example.com', '$2b$10$XFDJ3Xy8kX7s5J8Z5V5xJeUJYJvX8Qd9pX8J9vX9X9X9X9X9X9X9', 'EMP002', 'member', 1, datetime('now'), datetime('now')),
('Charlie Brown', 'charlie@example.com', '$2b$10$XFDJ3Xy8kX7s5J8Z5V5xJeUJYJvX8Qd9pX8J9vX9X9X9X9X9X9X9', 'EMP003', 'member', 1, datetime('now'), datetime('now')),
('David Williams', 'david@example.com', '$2b$10$XFDJ3Xy8kX7s5J8Z5V5xJeUJYJvX8Qd9pX8J9vX9X9X9X9X9X9X9', 'EMP004', 'member', 1, datetime('now'), datetime('now')),
('Eva Green', 'eva@example.com', '$2b$10$XFDJ3Xy8kX7s5J8Z5V5xJeUJYJvX8Qd9pX8J9vX9X9X9X9X9X9X9', 'EMP005', 'member', 1, datetime('now'), datetime('now'));

-- Insert admin settings for users (will skip if user_id already exists in admin_settings)
INSERT OR IGNORE INTO admin_settings (user_id, company_name, timezone, location_check_in, photo_check_in, created_at, updated_at)
SELECT id, 'TechCorp', 'UTC+05:30', 
  CASE WHEN id % 2 = 0 THEN 1 ELSE 0 END,  -- Alternate location_check_in
  CASE WHEN id % 3 = 0 THEN 1 ELSE 0 END,  -- Some users have photo check-in enabled
  datetime('now'), 
  datetime('now')
FROM users 
WHERE id BETWEEN 1 AND 5;  -- Only for the first 5 users

-- Insert sample login activities (one per user)
INSERT OR IGNORE INTO user_activity (user_id, activity_type, details, ip_address, user_agent, created_at, updated_at)
SELECT 
  id, 
  'login', 
  'Logged in to dashboard', 
  '192.168.1.' || (id + 1),  -- Generate unique IP for each user
  'Mozilla/5.0', 
  datetime('now'), 
  datetime('now')
FROM users 
WHERE id BETWEEN 1 AND 5;

-- Generate attendance data for weekdays in July and August 2025
WITH RECURSIVE dates(d) AS (
  SELECT date('2025-07-01')
  UNION ALL
  SELECT date(d, '+1 day')
  FROM dates
  WHERE d < date('2025-08-31')
)
INSERT OR IGNORE INTO attendance (user_id, type, timestamp, notes, latitude, longitude, address, photo, created_at, updated_at)
-- Check-ins at 9:00 AM
SELECT 
  user_id,
  'checkin',
  d || ' 09:00:00',
  'Morning check-in',
  12.9716 + (random() * 0.01 - 0.005),  -- Random offset around Bengaluru
  77.5946 + (random() * 0.01 - 0.005),
  'Bengaluru, India',
  NULL,
  datetime('now'),
  datetime('now')
FROM 
  (SELECT id as user_id FROM users WHERE id BETWEEN 1 AND 5),  -- Only for first 5 users
  dates
WHERE 
  strftime('%w', d) NOT IN ('0', '6')  -- Exclude weekends
  
UNION ALL

-- Check-outs at 6:00 PM
SELECT 
  user_id,
  'checkout',
  d || ' 18:00:00',
  'Evening check-out',
  12.9716 + (random() * 0.01 - 0.005),  -- Random offset around Bengaluru
  77.5946 + (random() * 0.01 - 0.005),
  'Bengaluru, India',
  NULL,
  datetime('now'),
  datetime('now')
FROM 
  (SELECT id as user_id FROM users WHERE id BETWEEN 1 AND 5),  -- Only for first 5 users
  dates
WHERE 
  strftime('%w', d) NOT IN ('0', '6');  -- Exclude weekends

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;
