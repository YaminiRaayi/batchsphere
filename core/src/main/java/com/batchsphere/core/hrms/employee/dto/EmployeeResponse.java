package com.batchsphere.core.hrms.employee.dto;

import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Builder
public record EmployeeResponse(
        UUID id,
        String employeeCode,
        String fullName,
        String email,
        String phone,
        String department,
        String site,
        String jobTitle,
        UUID managerEmployeeId,
        String managerEmployeeCode,
        String managerName,
        EmployeeStatus employmentStatus,
        EmployeeQualificationStatus qualificationStatus,
        LocalDate joinedOn,
        LocalDate lastTrainingDate,
        LocalDate nextTrainingDue,
        String remarks,
        Boolean isActive,
        String createdBy,
        LocalDateTime createdAt,
        String updatedBy,
        LocalDateTime updatedAt
) {
}
