CREATE TABLE supplier (
                          id UUID PRIMARY KEY,

                          supplier_code VARCHAR(100) NOT NULL UNIQUE,
                          supplier_name VARCHAR(255) NOT NULL,

                          contact_person VARCHAR(255),
                          email VARCHAR(255),
                          phone VARCHAR(50),

                          is_active BOOLEAN,

                          created_by VARCHAR(100),
                          created_at TIMESTAMP,

                          updated_by VARCHAR(100),
                          updated_at TIMESTAMP
);