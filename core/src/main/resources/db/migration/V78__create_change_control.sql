CREATE TABLE qms_change_control (
    id                      UUID         NOT NULL PRIMARY KEY,
    change_control_number   VARCHAR(100) NOT NULL UNIQUE,
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    change_type             VARCHAR(40)  NOT NULL,
    reason                  TEXT         NOT NULL,
    risk_classification     VARCHAR(20)  NOT NULL,
    status                  VARCHAR(30)  NOT NULL DEFAULT 'DRAFT',
    impact_assessment       TEXT,
    implementation_plan     TEXT,
    effectiveness_check     TEXT,
    closure_summary         TEXT,
    target_completion_date  DATE,
    submitted_by            VARCHAR(100),
    submitted_at            TIMESTAMP,
    approved_by             VARCHAR(100),
    approved_at             TIMESTAMP,
    approval_comments       TEXT,
    approval_esignature_id  UUID,
    rejected_by             VARCHAR(100),
    rejected_at             TIMESTAMP,
    rejection_reason        TEXT,
    closed_by               VARCHAR(100),
    closed_at               TIMESTAMP,
    closure_esignature_id   UUID,
    is_active               BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by              VARCHAR(100) NOT NULL,
    created_at              TIMESTAMP    NOT NULL,
    updated_by              VARCHAR(100),
    updated_at              TIMESTAMP
);

CREATE TABLE qms_change_control_affected_entity (
    id                  UUID         NOT NULL PRIMARY KEY,
    change_control_id   UUID         NOT NULL REFERENCES qms_change_control(id),
    entity_type         VARCHAR(40)  NOT NULL,
    entity_reference    VARCHAR(255) NOT NULL,
    entity_id           UUID,
    notes               TEXT,
    created_at          TIMESTAMP    NOT NULL
);
CREATE INDEX idx_cc_affected_entity_cc_id ON qms_change_control_affected_entity (change_control_id);

CREATE TABLE qms_change_control_task (
    id                  UUID         NOT NULL PRIMARY KEY,
    change_control_id   UUID         NOT NULL REFERENCES qms_change_control(id),
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    assigned_to         VARCHAR(100),
    due_date            DATE,
    status              VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    completed_at        TIMESTAMP,
    completed_by        VARCHAR(100),
    created_at          TIMESTAMP    NOT NULL,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE
);
CREATE INDEX idx_cc_task_cc_id ON qms_change_control_task (change_control_id);
