-- G-1: requires_instrument flag on spec_parameter
ALTER TABLE spec_parameter
    ADD COLUMN requires_instrument BOOLEAN NOT NULL DEFAULT FALSE;

-- LIMS-A: instrument linkage on qc_test_result
ALTER TABLE qc_test_result
    ADD COLUMN equipment_id UUID REFERENCES equipment(id);

ALTER TABLE qc_test_result
    ADD COLUMN instrument_ref VARCHAR(50);

-- LIMS-A: instrument usage log
CREATE TABLE instrument_usage_log (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id         UUID NOT NULL REFERENCES equipment(id),
    used_by              VARCHAR(100) NOT NULL,
    used_at              TIMESTAMP NOT NULL,
    purpose              VARCHAR(200),
    sampling_request_id  UUID REFERENCES sampling_request(id),
    condition_at_use     VARCHAR(30) NOT NULL DEFAULT 'NORMAL',
    anomaly_description  TEXT,
    linked_deviation_id  UUID REFERENCES qms_deviation(id),
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_instrument_usage_log_equipment ON instrument_usage_log(equipment_id);
CREATE INDEX idx_instrument_usage_log_sampling  ON instrument_usage_log(sampling_request_id);
