ALTER TABLE spec_master ADD COLUMN updated_by VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN updated_at TIMESTAMP;

ALTER TABLE moa_master ADD COLUMN updated_by VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN updated_at TIMESTAMP;

ALTER TABLE sampling_tool ADD COLUMN updated_by VARCHAR(100);
ALTER TABLE sampling_tool ADD COLUMN updated_at TIMESTAMP;
