CREATE TABLE vendor_corporate_document (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL REFERENCES vendor(id),
    document_type VARCHAR(100) NOT NULL,
    document_title VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(500) NOT NULL,
    uploaded_at TIMESTAMP NOT NULL,
    expiry_date DATE,
    status VARCHAR(30) NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_vendor_corporate_document_vendor_id
    ON vendor_corporate_document(vendor_id);
