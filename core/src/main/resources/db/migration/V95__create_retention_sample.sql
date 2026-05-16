CREATE TABLE retention_sample (
  id UUID PRIMARY KEY,
  sampling_request_id UUID NOT NULL REFERENCES sampling_request(id),
  lot_number VARCHAR(100) NOT NULL,
  material_id UUID REFERENCES material(id),
  material_name VARCHAR(255),
  quantity NUMERIC(14,4) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  container_description VARCHAR(255),
  storage_location VARCHAR(255) NOT NULL,
  storage_condition VARCHAR(100),
  retention_until DATE NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'STORED',
  received_by VARCHAR(100) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retrieval_reason TEXT,
  retrieved_by VARCHAR(100),
  retrieved_at TIMESTAMP WITH TIME ZONE,
  test_result_reference VARCHAR(255),
  disposal_reason TEXT,
  disposed_by VARCHAR(100),
  disposed_at TIMESTAMP WITH TIME ZONE,
  disposal_method VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_retention_sample_sampling_request ON retention_sample(sampling_request_id);
CREATE INDEX idx_retention_sample_status ON retention_sample(status);
CREATE INDEX idx_retention_sample_retention_until ON retention_sample(retention_until);
CREATE INDEX idx_retention_sample_lot_number ON retention_sample(lot_number);
