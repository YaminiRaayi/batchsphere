ALTER TABLE qc_investigation ADD COLUMN phase_two_escalated_by VARCHAR(100);
ALTER TABLE qc_investigation ADD COLUMN phase_two_escalated_at TIMESTAMP;
ALTER TABLE qc_investigation ADD COLUMN outcome_submitted_by VARCHAR(100);
ALTER TABLE qc_investigation ADD COLUMN outcome_submitted_at TIMESTAMP;
ALTER TABLE qc_investigation ADD COLUMN qa_review_decision VARCHAR(30);
