CREATE TABLE sample_chain_of_custody (
    id UUID PRIMARY KEY,
    sample_id UUID NOT NULL,
    sampling_request_id UUID NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    from_location VARCHAR(150),
    to_location VARCHAR(150),
    handed_over_by VARCHAR(100) NOT NULL,
    handed_over_at TIMESTAMP NOT NULL,
    received_by VARCHAR(100),
    received_at TIMESTAMP,
    receipt_condition VARCHAR(255),
    remarks VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_sample_chain_custody_sample
        FOREIGN KEY (sample_id) REFERENCES qc_sample(id),
    CONSTRAINT fk_sample_chain_custody_request
        FOREIGN KEY (sampling_request_id) REFERENCES sampling_request(id)
);

CREATE INDEX idx_sample_chain_custody_sample
    ON sample_chain_of_custody(sample_id);

CREATE INDEX idx_sample_chain_custody_request
    ON sample_chain_of_custody(sampling_request_id);

CREATE INDEX idx_sample_chain_custody_active_receipt
    ON sample_chain_of_custody(sampling_request_id, received_at, is_active);
