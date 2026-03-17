ALTER TABLE grn_item
    ADD COLUMN pallet_id UUID;

ALTER TABLE inventory
    ADD COLUMN pallet_id UUID;

ALTER TABLE inventory_transaction
    ADD COLUMN pallet_id UUID;

ALTER TABLE sampling_request
    ADD COLUMN pallet_id UUID;

ALTER TABLE grn_container
    ADD COLUMN pallet_id UUID;

ALTER TABLE grn_item
    ADD CONSTRAINT fk_grn_item_pallet
        FOREIGN KEY (pallet_id) REFERENCES pallet(id);

ALTER TABLE inventory
    ADD CONSTRAINT fk_inventory_pallet
        FOREIGN KEY (pallet_id) REFERENCES pallet(id);

ALTER TABLE inventory_transaction
    ADD CONSTRAINT fk_inventory_transaction_pallet
        FOREIGN KEY (pallet_id) REFERENCES pallet(id);

ALTER TABLE sampling_request
    ADD CONSTRAINT fk_sampling_request_pallet
        FOREIGN KEY (pallet_id) REFERENCES pallet(id);

ALTER TABLE grn_container
    ADD CONSTRAINT fk_grn_container_pallet
        FOREIGN KEY (pallet_id) REFERENCES pallet(id);

CREATE UNIQUE INDEX uk_inventory_stock_pallet
    ON inventory(material_id, batch_id, pallet_id);
