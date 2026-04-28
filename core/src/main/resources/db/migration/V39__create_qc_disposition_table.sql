CREATE TABLE qc_disposition (
                                id UUID PRIMARY KEY,
                                sample_id UUID UNIQUE,
                                sampling_request_id UUID NOT NULL UNIQUE,
                                status VARCHAR(30) NOT NULL,
                                decision_remarks VARCHAR(1000),
                                decision_by VARCHAR(100),
                                decision_at TIMESTAMP,
                                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                                created_by VARCHAR(100) NOT NULL,
                                created_at TIMESTAMP NOT NULL,
                                updated_by VARCHAR(100),
                                updated_at TIMESTAMP,
                                CONSTRAINT fk_qc_disposition_sample
                                    FOREIGN KEY (sample_id) REFERENCES qc_sample(id),
                                CONSTRAINT fk_qc_disposition_sampling_request
                                    FOREIGN KEY (sampling_request_id) REFERENCES sampling_request(id)
);
