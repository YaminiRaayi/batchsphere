ALTER TABLE vendor
    ADD COLUMN corporate_address TEXT,
    ADD COLUMN city VARCHAR(100),
    ADD COLUMN state VARCHAR(100),
    ADD COLUMN country VARCHAR(100),
    ADD COLUMN pincode VARCHAR(20);
