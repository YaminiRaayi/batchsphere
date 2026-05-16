CREATE TABLE approval_delegation (
  id UUID PRIMARY KEY,
  delegator_username VARCHAR(100) NOT NULL,
  delegate_username VARCHAR(100) NOT NULL,
  scope_entity_type VARCHAR(100),
  scope_action VARCHAR(120),
  valid_from TIMESTAMP NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  reason TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  revoked_by VARCHAR(100),
  revoked_at TIMESTAMP
);

CREATE INDEX idx_approval_delegation_delegate ON approval_delegation(delegate_username, is_active);
CREATE INDEX idx_approval_delegation_delegator ON approval_delegation(delegator_username, is_active);
CREATE INDEX idx_approval_delegation_scope ON approval_delegation(scope_entity_type, scope_action);
