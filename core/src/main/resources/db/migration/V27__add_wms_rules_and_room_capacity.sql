ALTER TABLE room
    ADD COLUMN max_capacity NUMERIC(18, 3),
    ADD COLUMN capacity_uom VARCHAR(20),
    ADD COLUMN temperature_range VARCHAR(100),
    ADD COLUMN humidity_range VARCHAR(100);

CREATE TABLE warehouse_zone_rule (
    id UUID PRIMARY KEY,
    room_id UUID NOT NULL,
    zone_name VARCHAR(100) NOT NULL,
    allowed_material_type VARCHAR(50),
    allowed_storage_condition VARCHAR(50),
    restricted_access BOOLEAN NOT NULL DEFAULT FALSE,
    quarantine_only BOOLEAN NOT NULL DEFAULT FALSE,
    rejected_only BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_warehouse_zone_rule_room
        FOREIGN KEY (room_id) REFERENCES room(id)
);

CREATE UNIQUE INDEX uk_warehouse_zone_rule_room_zone_rule
    ON warehouse_zone_rule(room_id, zone_name, COALESCE(allowed_material_type, ''), COALESCE(allowed_storage_condition, ''));

CREATE TABLE material_location_rule (
    id UUID PRIMARY KEY,
    material_id UUID NOT NULL,
    default_warehouse_id UUID,
    default_room_id UUID,
    default_rack_id UUID,
    quarantine_warehouse_id UUID,
    quarantine_room_id UUID,
    notes VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_material_location_rule_material
        FOREIGN KEY (material_id) REFERENCES material(id),
    CONSTRAINT fk_material_location_rule_default_warehouse
        FOREIGN KEY (default_warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_material_location_rule_default_room
        FOREIGN KEY (default_room_id) REFERENCES room(id),
    CONSTRAINT fk_material_location_rule_default_rack
        FOREIGN KEY (default_rack_id) REFERENCES rack(id),
    CONSTRAINT fk_material_location_rule_quarantine_warehouse
        FOREIGN KEY (quarantine_warehouse_id) REFERENCES warehouse(id),
    CONSTRAINT fk_material_location_rule_quarantine_room
        FOREIGN KEY (quarantine_room_id) REFERENCES room(id)
);

CREATE UNIQUE INDEX uk_material_location_rule_material
    ON material_location_rule(material_id);
