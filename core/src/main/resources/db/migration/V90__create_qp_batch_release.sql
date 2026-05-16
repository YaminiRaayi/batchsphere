CREATE TYPE batch_release_status AS ENUM ('PENDING_QP_REVIEW', 'UNDER_REVIEW', 'CERTIFIED', 'REJECTED', 'ON_HOLD');

CREATE TABLE qp_batch_release (
  id UUID PRIMARY KEY,
  release_number VARCHAR(30) UNIQUE NOT NULL,
  lot_number VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  grn_id UUID REFERENCES grn(id),
  batch_size NUMERIC(14,4),
  batch_uom VARCHAR(20),
  manufacture_date DATE,
  expiry_date DATE,
  status batch_release_status NOT NULL DEFAULT 'PENDING_QP_REVIEW',
  qc_disposition_confirmed BOOLEAN DEFAULT FALSE,
  oos_investigations_closed BOOLEAN DEFAULT FALSE,
  no_open_critical_deviations BOOLEAN DEFAULT FALSE,
  documents_complete BOOLEAN DEFAULT FALSE,
  qp_name VARCHAR(255),
  qp_employee_id UUID REFERENCES employee(id),
  qp_certification_statement TEXT,
  certified_at TIMESTAMP,
  certification_e_signature_id UUID,
  rejection_reason TEXT,
  on_hold_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP
);

CREATE INDEX idx_qp_batch_release_status ON qp_batch_release(status);
CREATE INDEX idx_qp_batch_release_material ON qp_batch_release(material_id);
CREATE INDEX idx_qp_batch_release_lot ON qp_batch_release(lot_number);
