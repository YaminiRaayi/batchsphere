CREATE TABLE qms_deviation (
    id UUID PRIMARY KEY,
    deviation_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    deviation_type VARCHAR(40) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    status VARCHAR(40) NOT NULL,
    source_module VARCHAR(40) NOT NULL,
    source_entity_id UUID,
    source_reference VARCHAR(120),
    department VARCHAR(100),
    detected_by VARCHAR(100) NOT NULL,
    detected_at TIMESTAMP NOT NULL,
    immediate_action TEXT,
    investigation_summary TEXT,
    root_cause TEXT,
    impact_assessment TEXT,
    closure_summary TEXT,
    closed_by VARCHAR(100),
    closed_at TIMESTAMP,
    closure_esignature_id UUID,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE INDEX idx_qms_deviation_status ON qms_deviation(status);
CREATE INDEX idx_qms_deviation_severity ON qms_deviation(severity);
CREATE INDEX idx_qms_deviation_source ON qms_deviation(source_module, source_entity_id);
