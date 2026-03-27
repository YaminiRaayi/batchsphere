ALTER TABLE sampling_request ADD COLUMN total_containers INTEGER;
ALTER TABLE sampling_request ADD COLUMN qc_decision_remarks VARCHAR(1000);
ALTER TABLE sampling_request ADD COLUMN qc_decided_by VARCHAR(100);
ALTER TABLE sampling_request ADD COLUMN qc_decided_at TIMESTAMP;

UPDATE sampling_request sr
SET pallet_id = gi.pallet_id,
    total_containers = gi.number_of_containers
FROM grn_item gi
WHERE sr.grn_item_id = gi.id;

ALTER TABLE sampling_request
    ALTER COLUMN total_containers SET NOT NULL;

ALTER TABLE sampling_plan ADD COLUMN spec_id UUID;
ALTER TABLE sampling_plan ADD COLUMN moa_id UUID;
ALTER TABLE sampling_plan ADD COLUMN analyst_employee_code VARCHAR(100);
ALTER TABLE sampling_plan ADD COLUMN sampling_tool_id UUID;

ALTER TABLE sampling_plan
    ADD CONSTRAINT fk_sampling_plan_spec
        FOREIGN KEY (spec_id) REFERENCES spec_master(id);

ALTER TABLE sampling_plan
    ADD CONSTRAINT fk_sampling_plan_moa
        FOREIGN KEY (moa_id) REFERENCES moa_master(id);

ALTER TABLE sampling_plan
    ADD CONSTRAINT fk_sampling_plan_sampling_tool
        FOREIGN KEY (sampling_tool_id) REFERENCES sampling_tool(id);

CREATE TABLE sampling_container_sample (
                                           id UUID PRIMARY KEY,
                                           sampling_plan_id UUID NOT NULL,
                                           grn_container_id UUID NOT NULL,
                                           container_number VARCHAR(100) NOT NULL,
                                           sampled_quantity NUMERIC(18,3) NOT NULL,
                                           created_by VARCHAR(100) NOT NULL,
                                           created_at TIMESTAMP NOT NULL,
                                           updated_by VARCHAR(100),
                                           updated_at TIMESTAMP,
                                           CONSTRAINT fk_sampling_container_sample_plan
                                               FOREIGN KEY (sampling_plan_id) REFERENCES sampling_plan(id),
                                           CONSTRAINT fk_sampling_container_sample_container
                                               FOREIGN KEY (grn_container_id) REFERENCES grn_container(id),
                                           CONSTRAINT uk_sampling_container_sample UNIQUE (sampling_plan_id, grn_container_id)
);
