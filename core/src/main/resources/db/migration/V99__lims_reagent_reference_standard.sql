CREATE TABLE lab_reagent (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reagent_code VARCHAR(50) NOT NULL UNIQUE,
    reagent_name VARCHAR(255) NOT NULL,
    grade VARCHAR(100),
    manufacturer VARCHAR(255),
    storage_condition VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE TABLE lab_reagent_lot (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reagent_id UUID NOT NULL REFERENCES lab_reagent(id),
    lot_number VARCHAR(100) NOT NULL,
    supplier VARCHAR(255),
    received_date DATE,
    expiry_date DATE NOT NULL,
    quantity_received DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_used DECIMAL(18, 6) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_lab_reagent_lot UNIQUE (reagent_id, lot_number),
    CONSTRAINT ck_lab_reagent_lot_qty CHECK (quantity_received >= 0 AND quantity_used >= 0)
);

CREATE TABLE lab_reference_standard (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    standard_code VARCHAR(50) NOT NULL UNIQUE,
    standard_name VARCHAR(255) NOT NULL,
    pharmacopeia VARCHAR(50),
    storage_condition VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE TABLE lab_reference_standard_lot (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    standard_id UUID NOT NULL REFERENCES lab_reference_standard(id),
    lot_number VARCHAR(100) NOT NULL,
    potency DECIMAL(18, 6),
    received_date DATE,
    expiry_date DATE NOT NULL,
    quantity_received DECIMAL(18, 6) NOT NULL DEFAULT 0,
    quantity_used DECIMAL(18, 6) NOT NULL DEFAULT 0,
    unit VARCHAR(50),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_lab_reference_standard_lot UNIQUE (standard_id, lot_number),
    CONSTRAINT ck_lab_reference_standard_lot_qty CHECK (quantity_received >= 0 AND quantity_used >= 0)
);

ALTER TABLE qc_test_result ADD COLUMN reagent_lot_id UUID;
ALTER TABLE qc_test_result ADD CONSTRAINT fk_qc_test_result_reagent_lot FOREIGN KEY (reagent_lot_id) REFERENCES lab_reagent_lot(id);

CREATE INDEX idx_lab_reagent_lot_expiry ON lab_reagent_lot(expiry_date);
CREATE INDEX idx_lab_reference_standard_lot_expiry ON lab_reference_standard_lot(expiry_date);
