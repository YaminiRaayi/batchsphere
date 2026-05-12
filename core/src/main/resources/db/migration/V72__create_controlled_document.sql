CREATE TABLE controlled_document (
    id UUID PRIMARY KEY,
    document_number VARCHAR(100) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    document_type VARCHAR(40) NOT NULL,
    category VARCHAR(120),
    department VARCHAR(120) NOT NULL,
    status VARCHAR(40) NOT NULL,
    current_revision_id UUID,
    linked_material_code VARCHAR(100),
    linked_moa_code VARCHAR(100),
    review_cycle_months INTEGER NOT NULL,
    next_review_date DATE,
    effective_date DATE,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE TABLE document_revision (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    revision VARCHAR(30) NOT NULL,
    revision_status VARCHAR(40) NOT NULL,
    change_summary TEXT NOT NULL,
    file_name VARCHAR(255),
    storage_path VARCHAR(500),
    effective_date DATE,
    superseded_at TIMESTAMP,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    submitted_by VARCHAR(100),
    submitted_at TIMESTAMP,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    CONSTRAINT fk_document_revision_document FOREIGN KEY (document_id) REFERENCES controlled_document(id)
);

CREATE TABLE document_approval (
    id UUID PRIMARY KEY,
    revision_id UUID NOT NULL,
    approval_step VARCHAR(50) NOT NULL,
    approver_role VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL,
    comments TEXT,
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    e_signature_id UUID,
    CONSTRAINT fk_document_approval_revision FOREIGN KEY (revision_id) REFERENCES document_revision(id)
);

CREATE INDEX idx_controlled_document_status ON controlled_document(status);
CREATE INDEX idx_controlled_document_type ON controlled_document(document_type);
CREATE INDEX idx_document_revision_document ON document_revision(document_id);
CREATE INDEX idx_document_approval_revision ON document_approval(revision_id);
