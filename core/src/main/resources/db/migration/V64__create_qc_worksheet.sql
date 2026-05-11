CREATE TABLE IF NOT EXISTS qc_worksheet (
    id UUID PRIMARY KEY,
    sampling_request_id UUID NOT NULL REFERENCES sampling_request(id),
    sample_id UUID NOT NULL REFERENCES qc_sample(id),
    spec_id UUID NOT NULL REFERENCES spec_master(id),
    status VARCHAR(40) NOT NULL,
    assigned_analyst VARCHAR(100) NOT NULL,
    reviewer VARCHAR(100),
    generated_at TIMESTAMP NOT NULL,
    generated_by VARCHAR(100) NOT NULL,
    reviewed_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

ALTER TABLE qc_test_result
    ADD COLUMN IF NOT EXISTS worksheet_id UUID;

ALTER TABLE qc_test_result
    ADD CONSTRAINT fk_qc_test_result_worksheet
    FOREIGN KEY (worksheet_id) REFERENCES qc_worksheet(id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_qc_worksheet_sample_active
    ON qc_worksheet(sample_id);

CREATE INDEX IF NOT EXISTS idx_qc_worksheet_sampling_request
    ON qc_worksheet(sampling_request_id);

CREATE INDEX IF NOT EXISTS idx_qc_test_result_worksheet
    ON qc_test_result(worksheet_id);
