ALTER TABLE spec_master
    DROP CONSTRAINT IF EXISTS spec_master_spec_code_key;

UPDATE spec_master
SET revision = COALESCE(NULLIF(TRIM(revision), ''), 'v1');

ALTER TABLE spec_master
    ALTER COLUMN revision SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_spec_master_code_revision'
    ) THEN
        ALTER TABLE spec_master
            ADD CONSTRAINT uq_spec_master_code_revision
                UNIQUE (spec_code, revision);
    END IF;
END $$;
