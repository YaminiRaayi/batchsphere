CREATE TABLE stability_study (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_number VARCHAR(50) NOT NULL UNIQUE,
    material_id UUID REFERENCES material(id),
    product_name VARCHAR(255) NOT NULL,
    batch_number VARCHAR(100),
    condition_label VARCHAR(100) NOT NULL,
    storage_condition VARCHAR(100),
    start_date DATE NOT NULL,
    oot_threshold_pct DECIMAL(10, 4) NOT NULL DEFAULT 10,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE TABLE stability_timepoint (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID NOT NULL REFERENCES stability_study(id),
    month_offset INTEGER NOT NULL,
    scheduled_date DATE NOT NULL,
    pulled_date DATE,
    pulled_by VARCHAR(100),
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_stability_timepoint UNIQUE (study_id, month_offset)
);

CREATE TABLE stability_result (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    study_id UUID NOT NULL REFERENCES stability_study(id),
    timepoint_id UUID NOT NULL REFERENCES stability_timepoint(id),
    spec_parameter_id UUID NOT NULL REFERENCES spec_parameter(id),
    parameter_name VARCHAR(255) NOT NULL,
    result_value DECIMAL(18, 6),
    result_text VARCHAR(500),
    unit VARCHAR(50),
    oot_flag BOOLEAN NOT NULL DEFAULT FALSE,
    entered_by VARCHAR(100) NOT NULL,
    entered_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT uq_stability_result UNIQUE (timepoint_id, spec_parameter_id)
);

CREATE INDEX idx_stability_timepoint_due ON stability_timepoint(scheduled_date, status);
CREATE INDEX idx_stability_result_study_param ON stability_result(study_id, spec_parameter_id);
