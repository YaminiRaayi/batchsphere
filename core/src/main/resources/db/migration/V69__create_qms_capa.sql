CREATE TABLE qms_capa (
    id UUID PRIMARY KEY,
    capa_number VARCHAR(100) NOT NULL UNIQUE,
    deviation_id UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(30) NOT NULL,
    status VARCHAR(40) NOT NULL,
    owner VARCHAR(100) NOT NULL,
    due_date DATE NOT NULL,
    corrective_action TEXT NOT NULL,
    preventive_action TEXT,
    effectiveness_check TEXT,
    completion_summary TEXT,
    closed_by VARCHAR(100),
    closed_at TIMESTAMP,
    closure_esignature_id UUID,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE INDEX idx_qms_capa_deviation ON qms_capa(deviation_id);
CREATE INDEX idx_qms_capa_status ON qms_capa(status);
CREATE INDEX idx_qms_capa_owner ON qms_capa(owner);
CREATE INDEX idx_qms_capa_due_date ON qms_capa(due_date);
