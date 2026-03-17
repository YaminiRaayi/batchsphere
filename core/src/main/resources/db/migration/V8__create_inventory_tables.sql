CREATE TABLE inventory (
                            id UUID PRIMARY KEY,
                            material_id UUID NOT NULL,
                            batch_id UUID NOT NULL,
                            warehouse_location VARCHAR(150) NOT NULL,
                            quantity_on_hand NUMERIC(18,3) NOT NULL,
                            uom VARCHAR(50) NOT NULL,
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            created_by VARCHAR(100) NOT NULL,
                            created_at TIMESTAMP NOT NULL,
                            updated_by VARCHAR(100),
                            updated_at TIMESTAMP,
                            CONSTRAINT fk_inventory_material
                                FOREIGN KEY (material_id) REFERENCES material(id),
                            CONSTRAINT fk_inventory_batch
                                FOREIGN KEY (batch_id) REFERENCES batch(id),
                            CONSTRAINT uk_inventory_stock UNIQUE (material_id, batch_id, warehouse_location)
);

CREATE TABLE inventory_transaction (
                                        id UUID PRIMARY KEY,
                                        inventory_id UUID NOT NULL,
                                        material_id UUID NOT NULL,
                                        batch_id UUID NOT NULL,
                                        warehouse_location VARCHAR(150) NOT NULL,
                                        transaction_type VARCHAR(30) NOT NULL,
                                        reference_type VARCHAR(30) NOT NULL,
                                        reference_id UUID NOT NULL,
                                        quantity NUMERIC(18,3) NOT NULL,
                                        uom VARCHAR(50) NOT NULL,
                                        remarks VARCHAR(500),
                                        created_by VARCHAR(100) NOT NULL,
                                        created_at TIMESTAMP NOT NULL,
                                        CONSTRAINT fk_inventory_transaction_inventory
                                            FOREIGN KEY (inventory_id) REFERENCES inventory(id),
                                        CONSTRAINT fk_inventory_transaction_material
                                            FOREIGN KEY (material_id) REFERENCES material(id),
                                        CONSTRAINT fk_inventory_transaction_batch
                                            FOREIGN KEY (batch_id) REFERENCES batch(id)
);
