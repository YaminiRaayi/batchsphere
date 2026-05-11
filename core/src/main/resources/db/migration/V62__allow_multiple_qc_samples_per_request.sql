ALTER TABLE qc_sample DROP CONSTRAINT IF EXISTS fk_qc_sample_sampling_request;
ALTER TABLE qc_sample DROP CONSTRAINT IF EXISTS uk_qc_sample_sampling_request;
ALTER TABLE qc_sample DROP CONSTRAINT IF EXISTS qc_sample_sampling_request_id_key;
ALTER TABLE qc_sample DROP CONSTRAINT IF EXISTS constraint_4c60;
DROP INDEX IF EXISTS constraint_4c60_index_6;

ALTER TABLE qc_sample
    ADD CONSTRAINT fk_qc_sample_sampling_request
    FOREIGN KEY (sampling_request_id) REFERENCES sampling_request(id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_qc_sample_request_type
    ON qc_sample (sampling_request_id, sample_type);
