ALTER TABLE qc_investigation ADD COLUMN phase1_outcome VARCHAR(30);
ALTER TABLE qc_investigation ADD COLUMN phase1_root_cause TEXT;
ALTER TABLE qc_investigation ADD COLUMN phase1_completed_by VARCHAR(100);
ALTER TABLE qc_investigation ADD COLUMN phase1_completed_at TIMESTAMP;
ALTER TABLE qc_investigation ADD COLUMN phase2_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE qc_investigation ADD COLUMN oot_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE qc_investigation ADD COLUMN retest_authorized BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE qc_investigation ADD COLUMN retest_sample_count INTEGER;
