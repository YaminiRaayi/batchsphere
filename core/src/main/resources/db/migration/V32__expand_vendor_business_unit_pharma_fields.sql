ALTER TABLE vendor_business_unit
    ADD COLUMN pincode VARCHAR(20),
    ADD COLUMN last_audit_date DATE,
    ADD COLUMN qa_rating NUMERIC(3,1),
    ADD COLUMN delivery_score NUMERIC(5,2),
    ADD COLUMN rejection_rate NUMERIC(5,2),
    ADD COLUMN open_capa_count INTEGER DEFAULT 0;
