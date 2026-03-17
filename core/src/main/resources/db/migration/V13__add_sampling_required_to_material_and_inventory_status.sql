ALTER TABLE material
    ADD COLUMN sampling_required BOOLEAN;

UPDATE material
SET sampling_required = TRUE
WHERE sampling_required IS NULL;

ALTER TABLE material
    ALTER COLUMN sampling_required SET NOT NULL;

ALTER TABLE inventory
    ADD COLUMN status VARCHAR(30);

UPDATE inventory
SET status = 'QUARANTINE'
WHERE status IS NULL;

ALTER TABLE inventory
    ALTER COLUMN status SET NOT NULL;
