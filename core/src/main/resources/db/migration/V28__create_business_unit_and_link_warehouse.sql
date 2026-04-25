CREATE TABLE business_unit (
    id UUID PRIMARY KEY,
    unit_code VARCHAR(50) NOT NULL UNIQUE,
    unit_name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

ALTER TABLE warehouse
    ADD COLUMN business_unit_id UUID;

ALTER TABLE warehouse
    ADD CONSTRAINT fk_warehouse_business_unit
    FOREIGN KEY (business_unit_id) REFERENCES business_unit(id);
