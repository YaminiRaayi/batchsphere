ALTER TABLE material
    ADD COLUMN spec_id UUID;

ALTER TABLE material
    ADD CONSTRAINT fk_material_spec
        FOREIGN KEY (spec_id) REFERENCES spec_master(id);

CREATE INDEX idx_material_spec_id
    ON material(spec_id);
