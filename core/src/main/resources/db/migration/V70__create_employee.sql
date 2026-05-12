CREATE TABLE employee (
    id UUID PRIMARY KEY,
    employee_code VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(40),
    department VARCHAR(100) NOT NULL,
    site VARCHAR(120),
    job_title VARCHAR(120) NOT NULL,
    manager_employee_id UUID,
    employment_status VARCHAR(40) NOT NULL DEFAULT 'ACTIVE',
    qualification_status VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    joined_on DATE,
    last_training_date DATE,
    next_training_due DATE,
    remarks VARCHAR(1000),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_by VARCHAR(100),
    updated_at TIMESTAMP,
    CONSTRAINT fk_employee_manager FOREIGN KEY (manager_employee_id) REFERENCES employee(id)
);

CREATE INDEX idx_employee_department ON employee(department);
CREATE INDEX idx_employee_status ON employee(employment_status);
CREATE INDEX idx_employee_qualification_status ON employee(qualification_status);
CREATE INDEX idx_app_user_employee_id ON app_user(employee_id);
