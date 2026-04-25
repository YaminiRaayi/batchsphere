ALTER TABLE vendor
    ADD COLUMN approved_since DATE,
    ADD COLUMN last_audit_date DATE,
    ADD COLUMN next_audit_due DATE,
    ADD COLUMN qa_rating NUMERIC(3,1),
    ADD COLUMN delivery_score NUMERIC(5,2),
    ADD COLUMN rejection_rate NUMERIC(5,2),
    ADD COLUMN open_capa_count INTEGER DEFAULT 0;
