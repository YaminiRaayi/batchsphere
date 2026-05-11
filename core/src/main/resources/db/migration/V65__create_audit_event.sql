CREATE TABLE IF NOT EXISTS audit_event (
    id UUID PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    event_type VARCHAR(60) NOT NULL,
    field_name VARCHAR(120),
    old_value TEXT,
    new_value TEXT,
    reason VARCHAR(1000),
    actor VARCHAR(100) NOT NULL,
    event_at TIMESTAMP NOT NULL,
    source VARCHAR(80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_audit_event_entity
    ON audit_event(entity_type, entity_id, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_event_actor
    ON audit_event(actor, event_at DESC);
