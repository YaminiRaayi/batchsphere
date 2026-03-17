ALTER TABLE material
    ADD COLUMN storage_condition VARCHAR(50);

UPDATE material
SET storage_condition = 'CONTROLLED_ROOM_TEMPERATURE'
WHERE storage_condition IS NULL;

ALTER TABLE material
    ALTER COLUMN storage_condition SET NOT NULL;
