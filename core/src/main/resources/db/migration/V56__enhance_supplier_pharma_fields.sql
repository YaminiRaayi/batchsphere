ALTER TABLE supplier ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS qualification_status VARCHAR(50);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS country_of_manufacture VARCHAR(100);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS gmpcert_number VARCHAR(100);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS gmpcert_issuing_authority VARCHAR(255);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS gmpcert_expiry_date DATE;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS approved_since DATE;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS last_audit_date DATE;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS next_audit_due DATE;
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS rejection_rate NUMERIC(5,2);
ALTER TABLE supplier ADD COLUMN IF NOT EXISTS open_capa_count INTEGER;

UPDATE supplier
SET supplier_type = COALESCE(supplier_type, 'DISTRIBUTOR'),
    qualification_status = COALESCE(qualification_status, CASE WHEN COALESCE(is_active, FALSE) THEN 'QUALIFIED' ELSE 'SUSPENDED' END),
    open_capa_count = COALESCE(open_capa_count, 0)
WHERE supplier_type IS NULL
   OR qualification_status IS NULL
   OR open_capa_count IS NULL;

ALTER TABLE supplier ALTER COLUMN supplier_type SET NOT NULL;
ALTER TABLE supplier ALTER COLUMN qualification_status SET NOT NULL;
ALTER TABLE supplier ALTER COLUMN open_capa_count SET DEFAULT 0;
ALTER TABLE supplier ALTER COLUMN open_capa_count SET NOT NULL;
