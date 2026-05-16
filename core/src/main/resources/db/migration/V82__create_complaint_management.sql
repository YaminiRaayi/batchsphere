CREATE TYPE complaint_source AS ENUM ('CUSTOMER', 'MARKET', 'CLINICAL', 'INTERNAL', 'DISTRIBUTOR', 'REGULATORY_AUTHORITY');
CREATE TYPE complaint_category AS ENUM ('PRODUCT_QUALITY', 'ADVERSE_EVENT', 'LABELING_ERROR', 'PACKAGING_DEFECT', 'EFFICACY', 'CONTAMINATION', 'OTHER');
CREATE TYPE complaint_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL');
CREATE TYPE complaint_status AS ENUM ('RECEIVED', 'UNDER_INVESTIGATION', 'PENDING_CLOSURE', 'CLOSED', 'WITHDRAWN');
CREATE TYPE regulatory_reportability AS ENUM ('NOT_ASSESSED', 'REPORTABLE', 'NOT_REPORTABLE', 'REPORTED');

CREATE TABLE complaint (
  id UUID PRIMARY KEY,
  complaint_number VARCHAR(30) UNIQUE NOT NULL,
  received_date DATE NOT NULL,
  source complaint_source NOT NULL,
  category complaint_category NOT NULL,
  severity complaint_severity NOT NULL,
  status complaint_status NOT NULL DEFAULT 'RECEIVED',
  product_name VARCHAR(255),
  lot_number VARCHAR(100),
  reported_by VARCHAR(255),
  description TEXT NOT NULL,
  initial_assessment TEXT,
  root_cause TEXT,
  impact_assessment TEXT,
  recall_required BOOLEAN DEFAULT FALSE,
  regulatory_reportability regulatory_reportability DEFAULT 'NOT_ASSESSED',
  regulatory_report_date DATE,
  regulatory_authority VARCHAR(100),
  linked_deviation_id UUID REFERENCES qms_deviation(id),
  linked_capa_id UUID REFERENCES qms_capa(id),
  closed_by VARCHAR(100),
  closed_at TIMESTAMP WITH TIME ZONE,
  closure_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
