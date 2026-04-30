ALTER TABLE material ADD COLUMN IF NOT EXISTS material_category VARCHAR(50);
ALTER TABLE material ADD COLUMN IF NOT EXISTS generic_names VARCHAR(500);
ALTER TABLE material ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50);
ALTER TABLE material ADD COLUMN IF NOT EXISTS cas_number VARCHAR(100);
ALTER TABLE material ADD COLUMN IF NOT EXISTS pharmacopoeial_ref VARCHAR(100);
ALTER TABLE material ADD COLUMN IF NOT EXISTS max_humidity VARCHAR(100);
ALTER TABLE material ADD COLUMN IF NOT EXISTS light_sensitivity VARCHAR(50);
ALTER TABLE material ADD COLUMN IF NOT EXISTS shelf_life_months INTEGER;
ALTER TABLE material ADD COLUMN IF NOT EXISTS retest_period_months INTEGER;
ALTER TABLE material ADD COLUMN IF NOT EXISTS reorder_level VARCHAR(100);
ALTER TABLE material ADD COLUMN IF NOT EXISTS lead_time_days INTEGER;
ALTER TABLE material ADD COLUMN IF NOT EXISTS controlled_substance BOOLEAN;

UPDATE material
SET controlled_substance = FALSE
WHERE controlled_substance IS NULL;

ALTER TABLE material
    ALTER COLUMN controlled_substance SET DEFAULT FALSE;

ALTER TABLE material
    ALTER COLUMN controlled_substance SET NOT NULL;
