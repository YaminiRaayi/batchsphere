ALTER TABLE grn_item
    ADD COLUMN container_type VARCHAR(30);

ALTER TABLE grn_item
    ADD COLUMN number_of_containers INTEGER;

ALTER TABLE grn_item
    ADD COLUMN quantity_per_container NUMERIC(18,3);

ALTER TABLE grn_item
    ADD COLUMN vendor_batch VARCHAR(100);

ALTER TABLE grn_item
    ADD COLUMN manufacture_date DATE;

ALTER TABLE grn_item
    ADD COLUMN expiry_date DATE;

ALTER TABLE grn_item
    ADD COLUMN retest_date DATE;

UPDATE grn_item
SET container_type = 'BAG',
    number_of_containers = 1,
    quantity_per_container = received_quantity,
    vendor_batch = 'UNKNOWN'
WHERE container_type IS NULL
   OR number_of_containers IS NULL
   OR quantity_per_container IS NULL
   OR vendor_batch IS NULL;

ALTER TABLE grn_item
    ALTER COLUMN container_type SET NOT NULL;

ALTER TABLE grn_item
    ALTER COLUMN number_of_containers SET NOT NULL;

ALTER TABLE grn_item
    ALTER COLUMN quantity_per_container SET NOT NULL;

ALTER TABLE grn_item
    ALTER COLUMN vendor_batch SET NOT NULL;
