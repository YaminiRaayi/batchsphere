CREATE SEQUENCE IF NOT EXISTS coa_number_seq START 1 INCREMENT 1;

ALTER TABLE qp_batch_release
    ADD COLUMN coa_number VARCHAR(30);

ALTER TABLE qp_batch_release
    ADD COLUMN coa_issued_at TIMESTAMP;

ALTER TABLE qp_batch_release
    ADD COLUMN coa_issued_by VARCHAR(100);

ALTER TABLE qp_batch_release
    ADD COLUMN coa_locked BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE qp_batch_release
    ADD COLUMN analyst_signed_by VARCHAR(100);

ALTER TABLE qp_batch_release
    ADD COLUMN analyst_signed_at TIMESTAMP;

CREATE UNIQUE INDEX uq_coa_number ON qp_batch_release(coa_number);
