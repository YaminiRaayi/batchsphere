ALTER TABLE qc_sample ADD COLUMN IF NOT EXISTS received_by_qc VARCHAR(100);
ALTER TABLE qc_sample ADD COLUMN IF NOT EXISTS received_at_qc TIMESTAMP;
ALTER TABLE qc_sample ADD COLUMN IF NOT EXISTS receipt_condition VARCHAR(255);
ALTER TABLE qc_sample ADD COLUMN IF NOT EXISTS qc_storage_location VARCHAR(150);

CREATE TABLE IF NOT EXISTS qc_test_result (
    id UUID PRIMARY KEY,
    sample_id UUID NOT NULL REFERENCES qc_sample(id),
    spec_parameter_id UUID NOT NULL REFERENCES spec_parameter(id),
    moa_id_used UUID REFERENCES moa_master(id),
    analyst_code VARCHAR(100) NOT NULL,
    result_value NUMERIC(18,6),
    result_text VARCHAR(500),
    status VARCHAR(30) NOT NULL,
    pass_fail_flag BOOLEAN,
    lower_limit_applied NUMERIC(18,4),
    upper_limit_applied NUMERIC(18,4),
    criteria_type_applied VARCHAR(50) NOT NULL,
    unit_applied VARCHAR(50),
    entered_at TIMESTAMP,
    reviewed_by VARCHAR(100),
    reviewed_at TIMESTAMP,
    remarks VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_qc_test_result_sample_parameter
    ON qc_test_result(sample_id, spec_parameter_id);

CREATE INDEX IF NOT EXISTS idx_qc_test_result_sample
    ON qc_test_result(sample_id);

CREATE INDEX IF NOT EXISTS idx_qc_test_result_status
    ON qc_test_result(status);
