ALTER TABLE qc_investigation ADD COLUMN IF NOT EXISTS investigation_number VARCHAR(100);
ALTER TABLE qc_investigation ADD COLUMN IF NOT EXISTS investigation_type VARCHAR(30);
ALTER TABLE qc_investigation ADD COLUMN IF NOT EXISTS phase VARCHAR(30);
ALTER TABLE qc_investigation ADD COLUMN IF NOT EXISTS phase_two_assessment VARCHAR(2000);

UPDATE qc_investigation
SET investigation_number = COALESCE(investigation_number, 'QCINV-LEGACY-' || SUBSTRING(CAST(id AS VARCHAR), 1, 8)),
    investigation_type = COALESCE(investigation_type, 'OOS'),
    phase = COALESCE(phase, CASE WHEN status = 'CLOSED' THEN 'PHASE_II' ELSE 'PHASE_I' END)
WHERE investigation_number IS NULL
   OR investigation_type IS NULL
   OR phase IS NULL;

ALTER TABLE qc_investigation ALTER COLUMN investigation_number SET NOT NULL;
ALTER TABLE qc_investigation ALTER COLUMN investigation_type SET NOT NULL;
ALTER TABLE qc_investigation ALTER COLUMN phase SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_qc_investigation_number
    ON qc_investigation(investigation_number);
