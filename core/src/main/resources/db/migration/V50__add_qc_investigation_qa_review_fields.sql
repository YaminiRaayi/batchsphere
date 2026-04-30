ALTER TABLE qc_investigation
    ADD COLUMN qa_review_remarks VARCHAR(2000);

ALTER TABLE qc_investigation
    ADD COLUMN qa_reviewed_by VARCHAR(100);

ALTER TABLE qc_investigation
    ADD COLUMN qa_reviewed_at TIMESTAMP NULL;
