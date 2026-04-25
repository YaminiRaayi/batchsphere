CREATE TABLE vendor_audit (
    id UUID PRIMARY KEY,
    bu_id UUID NOT NULL,
    audit_type VARCHAR(50) NOT NULL,
    scheduled_date DATE NOT NULL,
    completed_date DATE,
    audited_by VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL,
    outcome VARCHAR(50),
    observation_count INTEGER,
    critical_observation_count INTEGER,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_vendor_audit_bu
        FOREIGN KEY (bu_id) REFERENCES vendor_business_unit(id)
);

CREATE INDEX idx_vendor_audit_bu
    ON vendor_audit(bu_id, scheduled_date DESC);
