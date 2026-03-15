CREATE TABLE vendor (
                        id UUID PRIMARY KEY,
                        vendor_code VARCHAR(100) NOT NULL UNIQUE,
                        vendor_name VARCHAR(200) NOT NULL,
                        contact_person VARCHAR(255),
                        email VARCHAR(255),
                        phone VARCHAR(50),
                        is_approved BOOLEAN NOT NULL DEFAULT FALSE,
                        is_active BOOLEAN NOT NULL DEFAULT TRUE,
                        created_by VARCHAR(100) NOT NULL,
                        created_at TIMESTAMP NOT NULL,
                        updated_by VARCHAR(100),
                        updated_at TIMESTAMP
);
