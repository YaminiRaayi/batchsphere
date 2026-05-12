package com.batchsphere.core.hrms.employee.service;

import com.batchsphere.core.hrms.employee.dto.EmployeeRequest;
import com.batchsphere.core.hrms.employee.dto.EmployeeResponse;

import java.util.List;
import java.util.UUID;

public interface EmployeeService {

    EmployeeResponse createEmployee(EmployeeRequest request);

    List<EmployeeResponse> getEmployees(Boolean includeInactive);

    EmployeeResponse getEmployee(UUID id);

    EmployeeResponse updateEmployee(UUID id, EmployeeRequest request);

    void deactivateEmployee(UUID id, String updatedBy);
}
