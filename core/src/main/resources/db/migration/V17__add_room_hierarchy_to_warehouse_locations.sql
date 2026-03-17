CREATE TABLE room (
                      id UUID PRIMARY KEY,
                      warehouse_id UUID NOT NULL,
                      room_code VARCHAR(50) NOT NULL,
                      room_name VARCHAR(150) NOT NULL,
                      storage_condition VARCHAR(50) NOT NULL,
                      description VARCHAR(500),
                      is_active BOOLEAN NOT NULL DEFAULT TRUE,
                      created_by VARCHAR(100) NOT NULL,
                      created_at TIMESTAMP NOT NULL,
                      updated_by VARCHAR(100),
                      updated_at TIMESTAMP,
                      CONSTRAINT fk_room_warehouse
                          FOREIGN KEY (warehouse_id) REFERENCES warehouse(id)
);

CREATE UNIQUE INDEX uk_room_warehouse_code
    ON room(warehouse_id, room_code);

ALTER TABLE rack
    ADD COLUMN room_id UUID;

ALTER TABLE rack
    ADD CONSTRAINT fk_rack_room
        FOREIGN KEY (room_id) REFERENCES room(id);
