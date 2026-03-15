CREATE TABLE vendor_business_unit (
                                      id UUID PRIMARY KEY,
                                      vendor_id UUID NOT NULL,
                                      unit_name VARCHAR(200) NOT NULL,
                                      address TEXT,
                                      city VARCHAR(100),
                                      state VARCHAR(100),
                                      country VARCHAR(100),
                                      is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                      created_by VARCHAR(100) NOT NULL,
                                      created_at TIMESTAMP NOT NULL,
                                      updated_by VARCHAR(100),
                                      updated_at TIMESTAMP,
                                      CONSTRAINT fk_vbu_vendor
                                          FOREIGN KEY (vendor_id) REFERENCES vendor(id)
);