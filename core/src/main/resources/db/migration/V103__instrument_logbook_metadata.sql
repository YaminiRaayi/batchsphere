ALTER TABLE instrument_usage_log
    ADD COLUMN created_by VARCHAR(100);

ALTER TABLE instrument_usage_log
    ADD COLUMN updated_by VARCHAR(100);

ALTER TABLE instrument_usage_log
    ADD COLUMN updated_at TIMESTAMP;

ALTER TABLE instrument_usage_log
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE instrument_usage_log
SET created_by = COALESCE(used_by, 'SYSTEM_MIGRATION')
WHERE created_by IS NULL;

ALTER TABLE instrument_usage_log
    ALTER COLUMN created_by SET NOT NULL;

CREATE INDEX idx_instrument_usage_log_active ON instrument_usage_log(is_active);
