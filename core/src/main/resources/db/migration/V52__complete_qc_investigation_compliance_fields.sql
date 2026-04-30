ALTER TABLE qc_investigation
    ADD COLUMN phase_one_summary VARCHAR(2000);

ALTER TABLE qc_investigation
    ADD COLUMN phase_two_summary VARCHAR(2000);

ALTER TABLE qc_investigation
    ADD COLUMN capa_required BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE qc_investigation
    ADD COLUMN capa_reference VARCHAR(150);

ALTER TABLE qc_investigation
    ADD COLUMN returned_to_qc_by VARCHAR(100);

ALTER TABLE qc_investigation
    ADD COLUMN returned_to_qc_at TIMESTAMP NULL;

ALTER TABLE qc_investigation
    ADD COLUMN returned_to_qc_remarks VARCHAR(2000);

ALTER TABLE qc_investigation
    ADD COLUMN qa_review_confirmed_by VARCHAR(100);

ALTER TABLE qc_investigation
    ADD COLUMN qa_review_confirmation_text VARCHAR(120);

ALTER TABLE qc_investigation
    ADD COLUMN qa_review_confirmation_at TIMESTAMP NULL;

ALTER TABLE sampling_request
    ADD COLUMN qc_decision_confirmed_by VARCHAR(100);

ALTER TABLE sampling_request
    ADD COLUMN qc_decision_confirmation_text VARCHAR(120);

ALTER TABLE sampling_request
    ADD COLUMN qc_decision_confirmation_at TIMESTAMP NULL;
