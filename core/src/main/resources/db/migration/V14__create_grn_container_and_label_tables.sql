CREATE TABLE grn_container (
                               id UUID PRIMARY KEY,
                               grn_id UUID NOT NULL,
                               grn_item_id UUID NOT NULL,
                               material_id UUID NOT NULL,
                               batch_id UUID,
                               container_number VARCHAR(100) NOT NULL,
                               container_type VARCHAR(30) NOT NULL,
                               vendor_batch VARCHAR(100) NOT NULL,
                               internal_lot VARCHAR(100) NOT NULL,
                               quantity NUMERIC(18,3) NOT NULL,
                               uom VARCHAR(50) NOT NULL,
                               manufacture_date DATE,
                               expiry_date DATE,
                               retest_date DATE,
                               storage_condition VARCHAR(50) NOT NULL,
                               inventory_status VARCHAR(30) NOT NULL,
                               label_status VARCHAR(30) NOT NULL,
                               sampled BOOLEAN NOT NULL DEFAULT FALSE,
                               sampled_quantity NUMERIC(18,3),
                               sampling_location VARCHAR(150),
                               sampled_by VARCHAR(100),
                               sampled_at TIMESTAMP,
                               is_active BOOLEAN NOT NULL DEFAULT TRUE,
                               created_by VARCHAR(100) NOT NULL,
                               created_at TIMESTAMP NOT NULL,
                               updated_by VARCHAR(100),
                               updated_at TIMESTAMP,
                               CONSTRAINT fk_grn_container_grn
                                   FOREIGN KEY (grn_id) REFERENCES grn(id),
                               CONSTRAINT fk_grn_container_grn_item
                                   FOREIGN KEY (grn_item_id) REFERENCES grn_item(id),
                               CONSTRAINT fk_grn_container_material
                                   FOREIGN KEY (material_id) REFERENCES material(id),
                               CONSTRAINT fk_grn_container_batch
                                   FOREIGN KEY (batch_id) REFERENCES batch(id),
                               CONSTRAINT uk_grn_container_number UNIQUE (grn_item_id, container_number)
);

CREATE TABLE material_label (
                                id UUID PRIMARY KEY,
                                grn_container_id UUID NOT NULL,
                                label_type VARCHAR(30) NOT NULL,
                                label_status VARCHAR(30) NOT NULL,
                                label_content VARCHAR(4000) NOT NULL,
                                generated_by VARCHAR(100) NOT NULL,
                                generated_at TIMESTAMP NOT NULL,
                                applied_by VARCHAR(100),
                                applied_at TIMESTAMP,
                                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                CONSTRAINT fk_material_label_container
                                    FOREIGN KEY (grn_container_id) REFERENCES grn_container(id)
);
