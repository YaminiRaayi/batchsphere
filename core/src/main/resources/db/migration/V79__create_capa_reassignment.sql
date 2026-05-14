CREATE TABLE qms_capa_reassignment (
    id               UUID         NOT NULL PRIMARY KEY,
    capa_id          UUID         NOT NULL,
    previous_owner   VARCHAR(100) NOT NULL,
    new_owner        VARCHAR(100) NOT NULL,
    reason           TEXT         NOT NULL,
    assigned_by      VARCHAR(100) NOT NULL,
    assigned_at      TIMESTAMP    NOT NULL
);
CREATE INDEX idx_capa_reassignment_capa_id ON qms_capa_reassignment (capa_id);
