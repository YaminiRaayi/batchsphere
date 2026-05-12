CREATE TABLE training_assignment (
    id UUID PRIMARY KEY,
    assignment_code VARCHAR(80) NOT NULL UNIQUE,
    employee_id UUID NOT NULL,
    assigned_username VARCHAR(100) NOT NULL,
    training_title VARCHAR(255) NOT NULL,
    training_type VARCHAR(40) NOT NULL,
    document_id UUID,
    revision_id UUID,
    required_role VARCHAR(80),
    status VARCHAR(40) NOT NULL,
    due_date DATE,
    completed_at TIMESTAMP,
    completed_by VARCHAR(100),
    completion_comments TEXT,
    assigned_by VARCHAR(100) NOT NULL,
    assigned_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL,
    CONSTRAINT fk_training_assignment_employee FOREIGN KEY (employee_id) REFERENCES employee(id),
    CONSTRAINT fk_training_assignment_document FOREIGN KEY (document_id) REFERENCES controlled_document(id),
    CONSTRAINT fk_training_assignment_revision FOREIGN KEY (revision_id) REFERENCES document_revision(id)
);

CREATE TABLE role_qualification_requirement (
    id UUID PRIMARY KEY,
    role_name VARCHAR(80) NOT NULL,
    training_title VARCHAR(255) NOT NULL,
    training_type VARCHAR(40) NOT NULL,
    document_id UUID,
    revision_id UUID,
    recurrence_months INTEGER,
    is_mandatory BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_role_requirement_document FOREIGN KEY (document_id) REFERENCES controlled_document(id),
    CONSTRAINT fk_role_requirement_revision FOREIGN KEY (revision_id) REFERENCES document_revision(id)
);

CREATE INDEX idx_training_assignment_employee ON training_assignment(employee_id);
CREATE INDEX idx_training_assignment_username_status ON training_assignment(assigned_username, status);
CREATE INDEX idx_training_assignment_due_date ON training_assignment(due_date);
CREATE INDEX idx_role_requirement_role ON role_qualification_requirement(role_name);
