CREATE TABLE sampling_request (
                                  id UUID PRIMARY KEY,
                                  grn_id UUID NOT NULL,
                                  grn_item_id UUID NOT NULL UNIQUE,
                                  material_id UUID NOT NULL,
                                  batch_id UUID,
                                  warehouse_location VARCHAR(150) NOT NULL,
                                  request_status VARCHAR(30) NOT NULL,
                                  warehouse_label_applied BOOLEAN NOT NULL,
                                  sampling_label_required BOOLEAN NOT NULL,
                                  vendor_coa_release_allowed BOOLEAN NOT NULL,
                                  photosensitive_material BOOLEAN NOT NULL,
                                  hygroscopic_material BOOLEAN NOT NULL,
                                  hazardous_material BOOLEAN NOT NULL,
                                  selective_material BOOLEAN NOT NULL,
                                  remarks VARCHAR(500),
                                  is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                  created_by VARCHAR(100) NOT NULL,
                                  created_at TIMESTAMP NOT NULL,
                                  updated_by VARCHAR(100),
                                  updated_at TIMESTAMP,
                                  CONSTRAINT fk_sampling_request_grn
                                      FOREIGN KEY (grn_id) REFERENCES grn(id),
                                  CONSTRAINT fk_sampling_request_grn_item
                                      FOREIGN KEY (grn_item_id) REFERENCES grn_item(id),
                                  CONSTRAINT fk_sampling_request_material
                                      FOREIGN KEY (material_id) REFERENCES material(id),
                                  CONSTRAINT fk_sampling_request_batch
                                      FOREIGN KEY (batch_id) REFERENCES batch(id)
);

CREATE TABLE sampling_plan (
                               id UUID PRIMARY KEY,
                               sampling_request_id UUID NOT NULL UNIQUE,
                               sampling_method VARCHAR(30) NOT NULL,
                               sample_type VARCHAR(30) NOT NULL,
                               total_containers INTEGER NOT NULL,
                               containers_to_sample INTEGER NOT NULL,
                               individual_sample_quantity NUMERIC(18,3),
                               composite_sample_quantity NUMERIC(18,3),
                               sampling_location VARCHAR(150) NOT NULL,
                               sampling_tool_info VARCHAR(500),
                               photosensitive_handling_required BOOLEAN NOT NULL,
                               hygroscopic_handling_required BOOLEAN NOT NULL,
                               coa_based_release BOOLEAN NOT NULL,
                               rationale VARCHAR(1000),
                               sampling_label_applied BOOLEAN NOT NULL,
                               is_active BOOLEAN NOT NULL DEFAULT TRUE,
                               created_by VARCHAR(100) NOT NULL,
                               created_at TIMESTAMP NOT NULL,
                               updated_by VARCHAR(100),
                               updated_at TIMESTAMP,
                               CONSTRAINT fk_sampling_plan_request
                                   FOREIGN KEY (sampling_request_id) REFERENCES sampling_request(id)
);
