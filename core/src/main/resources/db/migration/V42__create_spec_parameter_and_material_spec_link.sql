CREATE TABLE spec_parameter (
    id UUID PRIMARY KEY,
    spec_id UUID NOT NULL,
    parameter_name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    moa_id UUID,
    criteria_type VARCHAR(50) NOT NULL,
    lower_limit NUMERIC(18,4),
    upper_limit NUMERIC(18,4),
    text_criteria VARCHAR(500),
    compendial_chapter_ref VARCHAR(200),
    unit VARCHAR(50),
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    sequence INT NOT NULL,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_spec_parameter_spec FOREIGN KEY (spec_id) REFERENCES spec_master(id),
    CONSTRAINT fk_spec_parameter_moa FOREIGN KEY (moa_id) REFERENCES moa_master(id)
);

CREATE INDEX idx_spec_parameter_spec_active_sequence
    ON spec_parameter(spec_id, is_active, sequence);

CREATE TABLE material_spec_link (
    id UUID PRIMARY KEY,
    material_id UUID NOT NULL,
    spec_id UUID NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    linked_by VARCHAR(100) NOT NULL,
    linked_at TIMESTAMP NOT NULL,
    delinked_by VARCHAR(100),
    delinked_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_material_spec_link_material FOREIGN KEY (material_id) REFERENCES material(id),
    CONSTRAINT fk_material_spec_link_spec FOREIGN KEY (spec_id) REFERENCES spec_master(id)
);

CREATE INDEX idx_material_spec_link_material_active
    ON material_spec_link(material_id, is_active);

INSERT INTO material_spec_link (
    id,
    material_id,
    spec_id,
    is_active,
    linked_by,
    linked_at,
    notes,
    created_at
)
SELECT
    (
        substr(md5(m.id::text || '-material-spec-link'), 1, 8) || '-' ||
        substr(md5(m.id::text || '-material-spec-link'), 9, 4) || '-' ||
        substr(md5(m.id::text || '-material-spec-link'), 13, 4) || '-' ||
        substr(md5(m.id::text || '-material-spec-link'), 17, 4) || '-' ||
        substr(md5(m.id::text || '-material-spec-link'), 21, 12)
    )::uuid,
    m.id,
    m.spec_id,
    true,
    COALESCE(m.updated_by, m.created_by),
    COALESCE(m.updated_at, m.created_at),
    'Backfilled from material.spec_id',
    COALESCE(m.created_at, now())
FROM material m
LEFT JOIN material_spec_link existing_link
    ON existing_link.material_id = m.id
   AND existing_link.is_active = true
WHERE m.spec_id IS NOT NULL
  AND existing_link.id IS NULL;
