CREATE TABLE em_monitoring_point (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    point_code VARCHAR(50) NOT NULL UNIQUE,
    point_name VARCHAR(255) NOT NULL,
    monitoring_type VARCHAR(50) NOT NULL,
    room_id UUID REFERENCES room(id),
    location_description VARCHAR(255),
    unit VARCHAR(50) NOT NULL,
    alert_limit DECIMAL(18, 6) NOT NULL,
    action_limit DECIMAL(18, 6) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE TABLE em_result (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    point_id UUID NOT NULL REFERENCES em_monitoring_point(id),
    result_value DECIMAL(18, 6) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    recorded_at TIMESTAMP NOT NULL,
    recorded_by VARCHAR(100) NOT NULL,
    alert_breached BOOLEAN NOT NULL DEFAULT FALSE,
    action_breached BOOLEAN NOT NULL DEFAULT FALSE,
    linked_deviation_id UUID REFERENCES qms_deviation(id),
    breach_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    notes VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP
);

CREATE INDEX idx_em_result_point_recorded ON em_result(point_id, recorded_at);
CREATE INDEX idx_em_result_breach ON em_result(action_breached, linked_deviation_id, breach_dismissed);
