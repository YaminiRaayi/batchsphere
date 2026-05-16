ALTER TABLE qc_test_result ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX idx_qc_test_result_sample_locked ON qc_test_result (sample_id, is_locked);
