ALTER TABLE qms_capa ADD COLUMN effectiveness_review_date DATE;
ALTER TABLE qms_capa ADD COLUMN effectiveness_reviewer VARCHAR(100);
ALTER TABLE qms_capa ADD COLUMN effectiveness_outcome VARCHAR(20) NOT NULL DEFAULT 'PENDING';
ALTER TABLE qms_capa ADD COLUMN effectiveness_outcome_comments TEXT;
ALTER TABLE qms_capa ADD COLUMN effectiveness_review_at TIMESTAMP;
ALTER TABLE qms_capa ADD COLUMN effectiveness_review_by VARCHAR(100);
ALTER TABLE qms_capa ADD COLUMN effectiveness_esignature_id UUID;
