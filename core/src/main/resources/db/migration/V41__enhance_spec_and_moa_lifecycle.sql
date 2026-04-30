ALTER TABLE spec_master ADD COLUMN spec_type VARCHAR(50);
ALTER TABLE spec_master ADD COLUMN status VARCHAR(50);
ALTER TABLE spec_master ADD COLUMN target_market VARCHAR(50);
ALTER TABLE spec_master ADD COLUMN effective_date DATE;
ALTER TABLE spec_master ADD COLUMN expiry_date DATE;
ALTER TABLE spec_master ADD COLUMN compendial_ref VARCHAR(50);
ALTER TABLE spec_master ADD COLUMN compendial_edition VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN reference_document_no VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN submitted_by VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE spec_master ADD COLUMN reviewed_by VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE spec_master ADD COLUMN review_remarks TEXT;
ALTER TABLE spec_master ADD COLUMN review_route VARCHAR(50);
ALTER TABLE spec_master ADD COLUMN approved_by VARCHAR(100);
ALTER TABLE spec_master ADD COLUMN approved_at TIMESTAMP;
ALTER TABLE spec_master ADD COLUMN previous_spec_id UUID;

UPDATE spec_master
SET status = 'APPROVED',
    spec_type = COALESCE(spec_type, 'MATERIAL'),
    review_route = COALESCE(review_route, 'QC_ONLY')
WHERE status IS NULL;

ALTER TABLE spec_master
    ALTER COLUMN spec_type SET NOT NULL;
ALTER TABLE spec_master
    ALTER COLUMN status SET NOT NULL;
ALTER TABLE spec_master
    ALTER COLUMN review_route SET NOT NULL;

ALTER TABLE spec_master
    ADD CONSTRAINT fk_spec_master_previous_spec
        FOREIGN KEY (previous_spec_id) REFERENCES spec_master(id);

CREATE INDEX idx_spec_master_status
    ON spec_master(status);

ALTER TABLE moa_master ADD COLUMN moa_type VARCHAR(50);
ALTER TABLE moa_master ADD COLUMN principle TEXT;
ALTER TABLE moa_master ADD COLUMN compendial_ref VARCHAR(50);
ALTER TABLE moa_master ADD COLUMN instrument_type VARCHAR(200);
ALTER TABLE moa_master ADD COLUMN reagents_and_standards TEXT;
ALTER TABLE moa_master ADD COLUMN system_suitability_criteria TEXT;
ALTER TABLE moa_master ADD COLUMN calculation_formula TEXT;
ALTER TABLE moa_master ADD COLUMN reportable_range VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN validation_reference_no VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN validation_attachment VARCHAR(500);
ALTER TABLE moa_master ADD COLUMN sample_solution_stability_value NUMERIC(18,2);
ALTER TABLE moa_master ADD COLUMN sample_solution_stability_unit VARCHAR(20);
ALTER TABLE moa_master ADD COLUMN sample_solution_stability_condition VARCHAR(200);
ALTER TABLE moa_master ADD COLUMN validation_status VARCHAR(50);
ALTER TABLE moa_master ADD COLUMN status VARCHAR(50);
ALTER TABLE moa_master ADD COLUMN submitted_by VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN submitted_at TIMESTAMP;
ALTER TABLE moa_master ADD COLUMN reviewed_by VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN reviewed_at TIMESTAMP;
ALTER TABLE moa_master ADD COLUMN review_remarks TEXT;
ALTER TABLE moa_master ADD COLUMN review_route VARCHAR(50);
ALTER TABLE moa_master ADD COLUMN approved_by VARCHAR(100);
ALTER TABLE moa_master ADD COLUMN approved_at TIMESTAMP;

UPDATE moa_master
SET validation_status = 'VALIDATED',
    status = 'APPROVED',
    review_route = COALESCE(review_route, 'QC_ONLY')
WHERE status IS NULL;

ALTER TABLE moa_master
    ALTER COLUMN validation_status SET NOT NULL;
ALTER TABLE moa_master
    ALTER COLUMN status SET NOT NULL;
ALTER TABLE moa_master
    ALTER COLUMN review_route SET NOT NULL;

CREATE INDEX idx_moa_master_status
    ON moa_master(status);
