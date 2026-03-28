CREATE TABLE warehouse (
                           id UUID PRIMARY KEY,
                           warehouse_code VARCHAR(50) NOT NULL UNIQUE,
                           warehouse_name VARCHAR(150) NOT NULL,
                           description VARCHAR(500),
                           is_active BOOLEAN NOT NULL DEFAULT TRUE,
                           created_by VARCHAR(100) NOT NULL,
                           created_at TIMESTAMP NOT NULL,
                           updated_by VARCHAR(100),
                           updated_at TIMESTAMP
);

CREATE TABLE rack (
                      id UUID PRIMARY KEY,
                      warehouse_id UUID NOT NULL,
                      rack_code VARCHAR(50) NOT NULL,
                      rack_name VARCHAR(150) NOT NULL,
                      description VARCHAR(500),
                      is_active BOOLEAN NOT NULL DEFAULT TRUE,
                      created_by VARCHAR(100) NOT NULL,
                      created_at TIMESTAMP NOT NULL,
                      updated_by VARCHAR(100),
                      updated_at TIMESTAMP,
                      CONSTRAINT fk_rack_warehouse
                          FOREIGN KEY (warehouse_id) REFERENCES warehouse(id)
);

CREATE TABLE shelf (
                       id UUID PRIMARY KEY,
                       rack_id UUID NOT NULL,
                       shelf_code VARCHAR(50) NOT NULL,
                       shelf_name VARCHAR(150) NOT NULL,
                       description VARCHAR(500),
                       is_active BOOLEAN NOT NULL DEFAULT TRUE,
                       created_by VARCHAR(100) NOT NULL,
                       created_at TIMESTAMP NOT NULL,
                       updated_by VARCHAR(100),
                       updated_at TIMESTAMP,
                       CONSTRAINT fk_shelf_rack
                           FOREIGN KEY (rack_id) REFERENCES rack(id)
);

CREATE TABLE pallet (
                        id UUID PRIMARY KEY,
                        shelf_id UUID NOT NULL,
                        pallet_code VARCHAR(50) NOT NULL,
                        pallet_name VARCHAR(150) NOT NULL,
                        storage_condition VARCHAR(50) NOT NULL,
                        description VARCHAR(500),
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_by VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        updated_by VARCHAR(100),
                        updated_at TIMESTAMP,
                        CONSTRAINT fk_pallet_shelf
                            FOREIGN KEY (shelf_id) REFERENCES shelf(id)
);
