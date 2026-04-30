ALTER TABLE vendor ADD COLUMN approved_since DATE;
ALTER TABLE vendor ADD COLUMN last_audit_date DATE;
ALTER TABLE vendor ADD COLUMN next_audit_due DATE;
ALTER TABLE vendor ADD COLUMN qa_rating NUMERIC(3,1);
ALTER TABLE vendor ADD COLUMN delivery_score NUMERIC(5,2);
ALTER TABLE vendor ADD COLUMN rejection_rate NUMERIC(5,2);
ALTER TABLE vendor ADD COLUMN open_capa_count INTEGER DEFAULT 0;
