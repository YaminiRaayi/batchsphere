CREATE TYPE risk_assessment_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACCEPTED', 'CLOSED');
CREATE TYPE risk_assessment_scope AS ENUM ('PROCESS', 'PRODUCT', 'EQUIPMENT', 'SUPPLIER', 'SYSTEM', 'MATERIAL', 'CHANGE_CONTROL', 'OTHER');
CREATE TYPE risk_control_type AS ENUM ('ELIMINATE', 'REDUCE_PROBABILITY', 'REDUCE_SEVERITY', 'INCREASE_DETECTABILITY', 'ACCEPT');

CREATE TABLE risk_assessment (
  id UUID PRIMARY KEY,
  assessment_number VARCHAR(30) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  scope risk_assessment_scope NOT NULL,
  scope_entity_type VARCHAR(50),
  scope_entity_id UUID,
  scope_entity_display VARCHAR(255),
  status risk_assessment_status NOT NULL DEFAULT 'DRAFT',
  methodology VARCHAR(50) DEFAULT 'FMEA',
  prepared_by VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(100),
  accepted_by VARCHAR(100),
  accepted_at TIMESTAMP WITH TIME ZONE,
  acceptance_e_signature_id UUID,
  next_review_date DATE,
  residual_risk_acceptable BOOLEAN,
  overall_risk_conclusion TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE risk_item (
  id UUID PRIMARY KEY,
  risk_assessment_id UUID NOT NULL REFERENCES risk_assessment(id),
  sequence_number INT NOT NULL,
  process_step VARCHAR(255),
  failure_mode TEXT NOT NULL,
  failure_effect TEXT NOT NULL,
  failure_cause TEXT NOT NULL,
  current_controls TEXT,
  probability INT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  detectability INT NOT NULL CHECK (detectability BETWEEN 1 AND 5),
  rpn INT NOT NULL DEFAULT 0,
  risk_control_type risk_control_type,
  proposed_action TEXT,
  action_owner VARCHAR(100),
  action_due_date DATE,
  linked_capa_id UUID REFERENCES qms_capa(id),
  residual_probability INT CHECK (residual_probability BETWEEN 1 AND 5),
  residual_severity INT CHECK (residual_severity BETWEEN 1 AND 5),
  residual_detectability INT CHECK (residual_detectability BETWEEN 1 AND 5),
  residual_rpn INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
