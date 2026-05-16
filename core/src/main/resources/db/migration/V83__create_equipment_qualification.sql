CREATE TYPE equipment_type AS ENUM (
  'BALANCE', 'HPLC', 'GC', 'UV_SPECTROPHOTOMETER', 'IR_SPECTROPHOTOMETER',
  'DISSOLUTION', 'PARTICLE_SIZE', 'KF_TITRATOR', 'PH_METER', 'TOC_ANALYZER',
  'STABILITY_CHAMBER', 'REFRIGERATOR', 'AUTOCLAVE', 'LAB_COMPUTER', 'OTHER'
);
CREATE TYPE equipment_status AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'PENDING_QUALIFICATION');
CREATE TYPE qualification_type AS ENUM ('IQ', 'OQ', 'PQ', 'REQUALIFICATION', 'CALIBRATION');
CREATE TYPE qualification_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');

CREATE TABLE equipment (
  id UUID PRIMARY KEY,
  equipment_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  equipment_type equipment_type NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(100),
  location VARCHAR(255) NOT NULL,
  status equipment_status NOT NULL DEFAULT 'PENDING_QUALIFICATION',
  installation_date DATE,
  last_qualification_date DATE,
  next_qualification_due DATE,
  last_calibration_date DATE,
  next_calibration_due DATE,
  calibration_interval_months INT DEFAULT 12,
  responsible_analyst VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE equipment_qualification_record (
  id UUID PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  qualification_type qualification_type NOT NULL,
  protocol_reference VARCHAR(255) NOT NULL,
  performed_by VARCHAR(100) NOT NULL,
  performed_at DATE NOT NULL,
  reviewed_by VARCHAR(100),
  reviewed_at DATE,
  result qualification_result NOT NULL DEFAULT 'PENDING',
  deviation_noted TEXT,
  next_requalification_due DATE,
  calibration_certificate_number VARCHAR(255),
  calibration_certificate_expiry DATE,
  e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
