CREATE TABLE IF NOT EXISTS e_signature_record (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(120) NOT NULL,
    meaning VARCHAR(255) NOT NULL,
    signer_username VARCHAR(100) NOT NULL,
    signer_role VARCHAR(50),
    signed_at TIMESTAMP NOT NULL,
    verification_method VARCHAR(50) NOT NULL,
    verification_status VARCHAR(30) NOT NULL,
    reason VARCHAR(1000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_e_signature_entity
    ON e_signature_record(entity_type, entity_id, signed_at DESC);

CREATE INDEX IF NOT EXISTS idx_e_signature_signer
    ON e_signature_record(signer_username, signed_at DESC);
