ALTER TABLE sampling_request
    ADD COLUMN parent_sampling_request_id UUID;

ALTER TABLE sampling_request
    ADD COLUMN root_sampling_request_id UUID;

ALTER TABLE sampling_request
    ADD COLUMN cycle_number INT;

ALTER TABLE sampling_request
    ADD COLUMN resample_reason VARCHAR(1000);

UPDATE sampling_request
SET root_sampling_request_id = id,
    cycle_number = 1
WHERE root_sampling_request_id IS NULL;

ALTER TABLE sampling_request
    ALTER COLUMN root_sampling_request_id SET NOT NULL;

ALTER TABLE sampling_request
    ALTER COLUMN cycle_number SET NOT NULL;

ALTER TABLE sampling_request
    ADD CONSTRAINT fk_sampling_request_parent
        FOREIGN KEY (parent_sampling_request_id) REFERENCES sampling_request(id);

ALTER TABLE sampling_request
    ADD CONSTRAINT fk_sampling_request_root
        FOREIGN KEY (root_sampling_request_id) REFERENCES sampling_request(id);

ALTER TABLE sampling_request DROP CONSTRAINT IF EXISTS fk_sampling_request_grn_item;
ALTER TABLE sampling_request DROP CONSTRAINT IF EXISTS sampling_request_grn_item_id_key;
ALTER TABLE sampling_request DROP CONSTRAINT IF EXISTS constraint_af;
ALTER TABLE sampling_request DROP CONSTRAINT IF EXISTS constraint_afa2;

ALTER TABLE sampling_request
    ADD CONSTRAINT fk_sampling_request_grn_item
        FOREIGN KEY (grn_item_id) REFERENCES grn_item(id);

CREATE INDEX idx_sampling_request_grn_item
    ON sampling_request(grn_item_id);

CREATE INDEX idx_sampling_request_root_cycle
    ON sampling_request(root_sampling_request_id, cycle_number);
