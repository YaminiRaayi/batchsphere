ALTER TABLE vendor
    ADD COLUMN vendor_category    VARCHAR(50),
    ADD COLUMN gstin              VARCHAR(15),
    ADD COLUMN pan                VARCHAR(10),
    ADD COLUMN website            VARCHAR(255),
    ADD COLUMN payment_terms_days INTEGER;
