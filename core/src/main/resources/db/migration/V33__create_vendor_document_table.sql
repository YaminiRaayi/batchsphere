CREATE TABLE vendor_document (
    id UUID PRIMARY KEY,
    bu_id UUID NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    expiry_date DATE,
    status VARCHAR(30) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT fk_vendor_document_bu
        FOREIGN KEY (bu_id) REFERENCES vendor_business_unit(id)
);

CREATE INDEX idx_vendor_document_bu
    ON vendor_document(bu_id, uploaded_at DESC);
