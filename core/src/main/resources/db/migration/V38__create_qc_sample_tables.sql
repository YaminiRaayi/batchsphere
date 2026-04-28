CREATE TABLE qc_sample (
                           id UUID PRIMARY KEY,
                           sample_number VARCHAR(100) NOT NULL UNIQUE,
                           sampling_request_id UUID NOT NULL UNIQUE,
                           batch_id UUID,
                           material_id UUID NOT NULL,
                           sample_type VARCHAR(30) NOT NULL,
                           sample_status VARCHAR(30) NOT NULL,
                           sample_quantity NUMERIC(18,3) NOT NULL,
                           uom VARCHAR(50) NOT NULL,
                           collected_by VARCHAR(100) NOT NULL,
                           collected_at TIMESTAMP NOT NULL,
                           sampling_location VARCHAR(150) NOT NULL,
                           handoff_to_qc_by VARCHAR(100),
                           handoff_to_qc_at TIMESTAMP,
                           remarks VARCHAR(500),
                           is_active BOOLEAN NOT NULL DEFAULT TRUE,
                           created_by VARCHAR(100) NOT NULL,
                           created_at TIMESTAMP NOT NULL,
                           updated_by VARCHAR(100),
                           updated_at TIMESTAMP,
                           CONSTRAINT fk_qc_sample_sampling_request
                               FOREIGN KEY (sampling_request_id) REFERENCES sampling_request(id),
                           CONSTRAINT fk_qc_sample_batch
                               FOREIGN KEY (batch_id) REFERENCES batch(id),
                           CONSTRAINT fk_qc_sample_material
                               FOREIGN KEY (material_id) REFERENCES material(id)
);

CREATE TABLE qc_sample_container_link (
                                          id UUID PRIMARY KEY,
                                          sample_id UUID NOT NULL,
                                          grn_container_id UUID NOT NULL,
                                          container_number VARCHAR(100) NOT NULL,
                                          sampled_quantity NUMERIC(18,3) NOT NULL,
                                          created_by VARCHAR(100) NOT NULL,
                                          created_at TIMESTAMP NOT NULL,
                                          updated_by VARCHAR(100),
                                          updated_at TIMESTAMP,
                                          CONSTRAINT fk_qc_sample_container_link_sample
                                              FOREIGN KEY (sample_id) REFERENCES qc_sample(id),
                                          CONSTRAINT fk_qc_sample_container_link_container
                                              FOREIGN KEY (grn_container_id) REFERENCES grn_container(id),
                                          CONSTRAINT uk_qc_sample_container_link UNIQUE (sample_id, grn_container_id)
);
