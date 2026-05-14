CREATE TABLE qms_capa_attachment (
    id           UUID         NOT NULL PRIMARY KEY,
    capa_id      UUID         NOT NULL,
    stage        VARCHAR(30)  NOT NULL,
    file_name    VARCHAR(255) NOT NULL,
    stored_path  TEXT         NOT NULL,
    file_size    BIGINT,
    mime_type    VARCHAR(100),
    uploaded_by  VARCHAR(100) NOT NULL,
    uploaded_at  TIMESTAMP    NOT NULL,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_capa_attachment_capa_id ON qms_capa_attachment (capa_id);
