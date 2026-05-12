ALTER TABLE grn ADD COLUMN coa_review_status VARCHAR(30);
ALTER TABLE grn ADD COLUMN coa_reviewed_by VARCHAR(100);
ALTER TABLE grn ADD COLUMN coa_reviewed_at TIMESTAMP;
ALTER TABLE grn ADD COLUMN coa_review_remarks TEXT;
ALTER TABLE grn ADD COLUMN temperature_on_arrival NUMERIC(8,2);
ALTER TABLE grn ADD COLUMN cold_chain_compliant BOOLEAN;
ALTER TABLE grn ADD COLUMN container_condition VARCHAR(100);
ALTER TABLE grn ADD COLUMN label_verification_status VARCHAR(100);
ALTER TABLE grn ADD COLUMN quantity_variance_reason TEXT;

UPDATE grn
SET coa_review_status = 'PENDING'
WHERE coa_review_status IS NULL;

ALTER TABLE grn
    ALTER COLUMN coa_review_status SET NOT NULL;
