CREATE TABLE spec_master (
                             id UUID PRIMARY KEY,
                             spec_code VARCHAR(100) NOT NULL UNIQUE,
                             spec_name VARCHAR(255) NOT NULL,
                             revision VARCHAR(50),
                             sampling_method VARCHAR(50) NOT NULL,
                             reference_attachment VARCHAR(500),
                             is_active BOOLEAN NOT NULL DEFAULT TRUE,
                             created_by VARCHAR(100) NOT NULL,
                             created_at TIMESTAMP NOT NULL
);

CREATE TABLE moa_master (
                            id UUID PRIMARY KEY,
                            moa_code VARCHAR(100) NOT NULL UNIQUE,
                            moa_name VARCHAR(255) NOT NULL,
                            revision VARCHAR(50),
                            reference_attachment VARCHAR(500),
                            is_active BOOLEAN NOT NULL DEFAULT TRUE,
                            created_by VARCHAR(100) NOT NULL,
                            created_at TIMESTAMP NOT NULL
);

CREATE TABLE sampling_tool (
                               id UUID PRIMARY KEY,
                               tool_code VARCHAR(100) NOT NULL UNIQUE,
                               tool_name VARCHAR(255) NOT NULL,
                               description VARCHAR(500),
                               is_active BOOLEAN NOT NULL DEFAULT TRUE,
                               created_by VARCHAR(100) NOT NULL,
                               created_at TIMESTAMP NOT NULL
);
