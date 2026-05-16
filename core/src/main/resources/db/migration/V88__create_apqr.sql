-- Ticket 7.2: Annual Product Quality Review (APQR)
-- Regulatory Basis: ICH Q10 §3.2.1, EU GMP Chapter 1.10

CREATE TYPE apqr_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'CLOSED');

CREATE TABLE IF NOT EXISTS apqr (
  id UUID PRIMARY KEY,
  apqr_number VARCHAR(30) UNIQUE NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  review_year INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status apqr_status NOT NULL DEFAULT 'DRAFT',
  total_batches_manufactured INT DEFAULT 0,
  total_grn_received INT DEFAULT 0,
  grn_rejection_count INT DEFAULT 0,
  oos_count INT DEFAULT 0,
  oot_count INT DEFAULT 0,
  deviation_count INT DEFAULT 0,
  open_capa_count INT DEFAULT 0,
  change_control_count INT DEFAULT 0,
  complaint_count INT DEFAULT 0,
  process_in_control BOOLEAN,
  trends_identified TEXT,
  recommendations TEXT,
  prepared_by VARCHAR(100),
  prepared_at TIMESTAMP,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  approval_e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);

CREATE UNIQUE INDEX idx_apqr_product_year ON apqr(material_id, review_year);

COMMENT ON TABLE apqr IS 'Annual Product Quality Review per ICH Q10 and EU GMP Chapter 1.10';
