CREATE TABLE IF NOT EXISTS vendor_material_approval (
    id UUID PRIMARY KEY,
    vendor_id UUID NOT NULL,
    vendor_business_unit_id UUID NOT NULL,
    supplier_id UUID NOT NULL,
    material_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL,
    approval_basis VARCHAR(50) NOT NULL,
    qualification_date DATE,
    next_requalification_date DATE,
    approved_by VARCHAR(100) NOT NULL,
    remarks TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_vendor_material_approval_vendor FOREIGN KEY (vendor_id) REFERENCES vendor(id),
    CONSTRAINT fk_vendor_material_approval_vbu FOREIGN KEY (vendor_business_unit_id) REFERENCES vendor_business_unit(id),
    CONSTRAINT fk_vendor_material_approval_supplier FOREIGN KEY (supplier_id) REFERENCES supplier(id),
    CONSTRAINT fk_vendor_material_approval_material FOREIGN KEY (material_id) REFERENCES material(id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_material_approval_lookup
    ON vendor_material_approval(vendor_id, vendor_business_unit_id, supplier_id, material_id, is_active);
