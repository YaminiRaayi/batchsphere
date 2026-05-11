ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS retest_due_date DATE;

UPDATE inventory i
SET expiry_date = b.expiry_date,
    retest_due_date = b.retest_date
FROM batch b
WHERE i.batch_id = b.id
  AND (i.expiry_date IS NULL OR i.retest_due_date IS NULL);
