CREATE TABLE grn_document (
                              id UUID PRIMARY KEY,
                              grn_id UUID NOT NULL,
                              document_name VARCHAR(255) NOT NULL,
                              document_type VARCHAR(100) NOT NULL,
                              file_name VARCHAR(255) NOT NULL,
                              document_path VARCHAR(1000),
                              document_url VARCHAR(1000),
                              is_active BOOLEAN NOT NULL DEFAULT TRUE,
                              created_by VARCHAR(100) NOT NULL,
                              created_at TIMESTAMP NOT NULL,
                              CONSTRAINT fk_grn_document_grn
                                  FOREIGN KEY (grn_id) REFERENCES grn(id)
);
