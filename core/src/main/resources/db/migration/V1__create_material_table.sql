CREATE TABLE material (
                          id UUID PRIMARY KEY,
                          material_code VARCHAR(50) UNIQUE NOT NULL,
                          material_name VARCHAR(255) NOT NULL,
                          material_type VARCHAR(50) NOT NULL,
                          is_active BOOLEAN NOT NULL DEFAULT TRUE,
                          created_by VARCHAR(100) NOT NULL,
                          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                          updated_by VARCHAR(100),
                          updated_at TIMESTAMP
);