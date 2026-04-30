ALTER TABLE vendor_business_unit ADD COLUMN pincode VARCHAR(20);
ALTER TABLE vendor_business_unit ADD COLUMN last_audit_date DATE;
ALTER TABLE vendor_business_unit ADD COLUMN qa_rating NUMERIC(3,1);
ALTER TABLE vendor_business_unit ADD COLUMN delivery_score NUMERIC(5,2);
ALTER TABLE vendor_business_unit ADD COLUMN rejection_rate NUMERIC(5,2);
ALTER TABLE vendor_business_unit ADD COLUMN open_capa_count INTEGER DEFAULT 0;
