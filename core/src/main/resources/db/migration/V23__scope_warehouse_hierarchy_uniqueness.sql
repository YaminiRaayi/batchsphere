ALTER TABLE rack DROP CONSTRAINT IF EXISTS rack_rack_code_key;
ALTER TABLE shelf DROP CONSTRAINT IF EXISTS shelf_shelf_code_key;
ALTER TABLE pallet DROP CONSTRAINT IF EXISTS pallet_pallet_code_key;

DROP INDEX IF EXISTS rack_rack_code_key;
DROP INDEX IF EXISTS shelf_shelf_code_key;
DROP INDEX IF EXISTS pallet_pallet_code_key;
DROP INDEX IF EXISTS uk_rack_room_code;
DROP INDEX IF EXISTS uk_shelf_rack_code;
DROP INDEX IF EXISTS uk_pallet_shelf_code;

CREATE UNIQUE INDEX uk_rack_room_code
    ON rack(room_id, rack_code);

CREATE UNIQUE INDEX uk_shelf_rack_code
    ON shelf(rack_id, shelf_code);

CREATE UNIQUE INDEX uk_pallet_shelf_code
    ON pallet(shelf_id, pallet_code);
