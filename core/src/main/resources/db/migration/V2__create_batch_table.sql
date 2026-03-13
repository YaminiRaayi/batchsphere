CREATE TABLE batch (
                       id UUID PRIMARY KEY,
                       batch_number VARCHAR(100) NOT NULL UNIQUE,
                       material_id UUID NOT NULL,
                       batch_type VARCHAR(30) NOT NULL,
                       status VARCHAR(30) NOT NULL,
                       quantity NUMERIC(18,3) NOT NULL,
                       unit_of_measure VARCHAR(20) NOT NULL,
                       manufacture_date DATE,
                       expiry_date DATE,
                       retest_date DATE,
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_by VARCHAR(100) NOT NULL,
                       created_at TIMESTAMP NOT NULL,
                       updated_by VARCHAR(100),
                       updated_at TIMESTAMP,
                       CONSTRAINT fk_batch_material
                           FOREIGN KEY (material_id) REFERENCES material(id)
);