package com.batchsphere.core.hrms.employee.dto;

import com.batchsphere.core.hrms.employee.entity.EmployeeQualificationStatus;
import com.batchsphere.core.hrms.employee.entity.EmployeeStatus;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDate;
import java.util.UUID;

@Data
public class EmployeeRequest {

    @NotBlank
    @Size(max = 50)
    private String employeeCode;

    @NotBlank
    @Size(max = 150)
    private String fullName;

    @Email
    @Size(max = 150)
    private String email;

    @Size(max = 40)
    private String phone;

    @NotBlank
    @Size(max = 100)
    private String department;

    @Size(max = 120)
    private String site;

    @NotBlank
    @Size(max = 120)
    private String jobTitle;

    private UUID managerEmployeeId;

    private EmployeeStatus employmentStatus;

    private EmployeeQualificationStatus qualificationStatus;

    private LocalDate joinedOn;

    private LocalDate lastTrainingDate;

    private LocalDate nextTrainingDue;

    @Size(max = 1000)
    private String remarks;

    private String createdBy;

    private String updatedBy;
}
