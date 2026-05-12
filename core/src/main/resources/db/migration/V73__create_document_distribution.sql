CREATE TABLE document_distribution (
    id UUID PRIMARY KEY,
    document_id UUID NOT NULL,
    revision_id UUID NOT NULL,
    assigned_username VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL,
    due_date DATE,
    assigned_by VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP NOT NULL,
    acknowledged_by VARCHAR(100),
    acknowledged_at TIMESTAMP,
    acknowledgement_e_signature_id UUID,
    comments TEXT,
    is_active BOOLEAN NOT NULL,
    CONSTRAINT fk_document_distribution_document FOREIGN KEY (document_id) REFERENCES controlled_document(id),
    CONSTRAINT fk_document_distribution_revision FOREIGN KEY (revision_id) REFERENCES document_revision(id)
);

CREATE UNIQUE INDEX uq_document_distribution_user_revision_active
    ON document_distribution(revision_id, assigned_username, is_active);

CREATE INDEX idx_document_distribution_document ON document_distribution(document_id);
CREATE INDEX idx_document_distribution_revision ON document_distribution(revision_id);
CREATE INDEX idx_document_distribution_user_status ON document_distribution(assigned_username, status);
