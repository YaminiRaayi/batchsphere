CREATE TABLE security_audit_event (
  id UUID PRIMARY KEY,
  event_type VARCHAR(30) NOT NULL,
  username VARCHAR(100),
  ip_address VARCHAR(45),
  user_agent VARCHAR(500),
  session_id VARCHAR(255),
  details VARCHAR(500),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_security_audit_event_username ON security_audit_event (username);
CREATE INDEX idx_security_audit_event_occurred_at ON security_audit_event (occurred_at);
CREATE INDEX idx_security_audit_event_type ON security_audit_event (event_type);
