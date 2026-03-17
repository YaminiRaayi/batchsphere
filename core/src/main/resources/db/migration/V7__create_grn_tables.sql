CREATE TABLE grn (
                      id UUID PRIMARY KEY,
                      grn_number VARCHAR(100) NOT NULL UNIQUE,
                      supplier_id UUID NOT NULL,
                      vendor_id UUID NOT NULL,
                      vendor_business_unit_id UUID NOT NULL,
                      receipt_date DATE NOT NULL,
                      invoice_number VARCHAR(100),
                      remarks TEXT,
                      status VARCHAR(30) NOT NULL,
                      is_active BOOLEAN NOT NULL DEFAULT TRUE,
                      created_by VARCHAR(100) NOT NULL,
                      created_at TIMESTAMP NOT NULL,
                      updated_by VARCHAR(100),
                      updated_at TIMESTAMP,
                      CONSTRAINT fk_grn_supplier
                          FOREIGN KEY (supplier_id) REFERENCES supplier(id),
                      CONSTRAINT fk_grn_vendor
                          FOREIGN KEY (vendor_id) REFERENCES vendor(id),
                      CONSTRAINT fk_grn_vendor_business_unit
                          FOREIGN KEY (vendor_business_unit_id) REFERENCES vendor_business_unit(id)
);

CREATE TABLE grn_item (
                           id UUID PRIMARY KEY,
                           grn_id UUID NOT NULL,
                           line_number INTEGER NOT NULL,
                           material_id UUID NOT NULL,
                           batch_id UUID,
                           received_quantity NUMERIC(18,3) NOT NULL,
                           accepted_quantity NUMERIC(18,3) NOT NULL,
                           rejected_quantity NUMERIC(18,3) NOT NULL,
                           uom VARCHAR(50) NOT NULL,
                           warehouse_location VARCHAR(150) NOT NULL,
                           unit_price NUMERIC(18,2) NOT NULL,
                           total_price NUMERIC(18,2) NOT NULL,
                           qc_status VARCHAR(30) NOT NULL,
                           description VARCHAR(500),
                           is_active BOOLEAN NOT NULL DEFAULT TRUE,
                           created_by VARCHAR(100) NOT NULL,
                           created_at TIMESTAMP NOT NULL,
                           updated_by VARCHAR(100),
                           updated_at TIMESTAMP,
                           CONSTRAINT fk_grn_item_grn
                               FOREIGN KEY (grn_id) REFERENCES grn(id),
                           CONSTRAINT fk_grn_item_material
                               FOREIGN KEY (material_id) REFERENCES material(id),
                           CONSTRAINT fk_grn_item_batch
                               FOREIGN KEY (batch_id) REFERENCES batch(id),
                           CONSTRAINT uk_grn_item_line UNIQUE (grn_id, line_number)
);
