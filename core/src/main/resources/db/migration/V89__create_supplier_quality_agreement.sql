CREATE TYPE sqa_status AS ENUM ('DRAFT', 'UNDER_NEGOTIATION', 'ACTIVE', 'EXPIRED', 'TERMINATED');

CREATE TABLE supplier_quality_agreement (
  id UUID PRIMARY KEY,
  sqa_number VARCHAR(30) UNIQUE NOT NULL,
  supplier_id UUID REFERENCES supplier(id),
  vendor_business_unit_id UUID REFERENCES vendor_business_unit(id),
  title VARCHAR(255) NOT NULL,
  effective_date DATE,
  expiry_date DATE,
  status sqa_status NOT NULL DEFAULT 'DRAFT',
  sop_document_id UUID REFERENCES controlled_document(id),
  gmp_responsibilities TEXT,
  change_notification_requirements TEXT,
  audit_rights TEXT,
  testing_responsibilities TEXT,
  retention_sample_requirements TEXT,
  agreed_acceptance_criteria TEXT,
  our_signatory VARCHAR(100),
  our_signatory_date DATE,
  supplier_signatory VARCHAR(255),
  supplier_signatory_date DATE,
  terminated_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);

CREATE INDEX idx_sqa_supplier ON supplier_quality_agreement(supplier_id);
CREATE INDEX idx_sqa_status ON supplier_quality_agreement(status);
CREATE INDEX idx_sqa_expiry ON supplier_quality_agreement(expiry_date);
