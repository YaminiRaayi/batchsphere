ALTER TABLE app_user ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_user ADD COLUMN locked_until TIMESTAMP NULL;
ALTER TABLE app_user ADD COLUMN password_changed_at TIMESTAMP NULL;
ALTER TABLE app_user ADD COLUMN force_password_change BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE app_user
SET password_changed_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
WHERE password_changed_at IS NULL;

CREATE INDEX idx_app_user_locked_until ON app_user (locked_until);
