ALTER TABLE qms_capa ADD COLUMN approval_status VARCHAR(30) NOT NULL DEFAULT 'NONE';
ALTER TABLE qms_capa ADD COLUMN submitted_for_approval_by VARCHAR(100);
ALTER TABLE qms_capa ADD COLUMN submitted_for_approval_at TIMESTAMP;
ALTER TABLE qms_capa ADD COLUMN approved_by VARCHAR(100);
ALTER TABLE qms_capa ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE qms_capa ADD COLUMN approval_comments TEXT;
ALTER TABLE qms_capa ADD COLUMN approval_esignature_id UUID;
