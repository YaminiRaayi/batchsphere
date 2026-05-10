ALTER TABLE inventory_transaction
    ADD COLUMN reference_number VARCHAR(100);

ALTER TABLE inventory_transaction
    ADD COLUMN before_quantity NUMERIC(18,3);

ALTER TABLE inventory_transaction
    ADD COLUMN after_quantity NUMERIC(18,3);
