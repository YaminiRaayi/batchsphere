ALTER TABLE app_user ADD COLUMN totp_secret VARCHAR(100) NULL;
ALTER TABLE app_user ADD COLUMN totp_pending_secret VARCHAR(100) NULL;
ALTER TABLE app_user ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_app_user_totp_enabled ON app_user (totp_enabled);
