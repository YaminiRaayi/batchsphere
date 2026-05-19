ALTER TABLE grn_item DROP CONSTRAINT IF EXISTS uk_grn_item_line;

CREATE INDEX IF NOT EXISTS idx_grn_item_active_line
    ON grn_item (grn_id, is_active, line_number);

ALTER TABLE grn_document ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE grn_document ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

ALTER TABLE qms_change_control_affected_entity ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE qms_change_control_affected_entity ADD COLUMN IF NOT EXISTS updated_by VARCHAR(100);
ALTER TABLE qms_change_control_affected_entity ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_cc_affected_entity_active
    ON qms_change_control_affected_entity (change_control_id, is_active);
