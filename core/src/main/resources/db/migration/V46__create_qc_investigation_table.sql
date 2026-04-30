CREATE TABLE qc_investigation (
    id UUID PRIMARY KEY,
    qc_disposition_id UUID NOT NULL REFERENCES qc_disposition(id),
    sampling_request_id UUID NOT NULL REFERENCES sampling_request(id),
    sample_id UUID NOT NULL REFERENCES qc_sample(id),
    qc_test_result_id UUID NOT NULL REFERENCES qc_test_result(id),
    status VARCHAR(30) NOT NULL,
    outcome VARCHAR(30),
    reason VARCHAR(1000) NOT NULL,
    initial_assessment VARCHAR(2000),
    root_cause VARCHAR(2000),
    resolution_remarks VARCHAR(2000),
    opened_by VARCHAR(100) NOT NULL,
    opened_at TIMESTAMP NOT NULL,
    closed_by VARCHAR(100),
    closed_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE INDEX idx_qc_investigation_sampling_request
    ON qc_investigation(sampling_request_id, is_active, created_at);

CREATE INDEX idx_qc_investigation_test_result
    ON qc_investigation(qc_test_result_id, is_active, status);
