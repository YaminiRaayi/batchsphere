package com.batchsphere.core.hrms.employee.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "employee")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Employee {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "employee_code", nullable = false, unique = true, length = 50)
    private String employeeCode;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(unique = true, length = 150)
    private String email;

    @Column(length = 40)
    private String phone;

    @Column(nullable = false, length = 100)
    private String department;

    @Column(length = 120)
    private String site;

    @Column(name = "job_title", nullable = false, length = 120)
    private String jobTitle;

    @Column(name = "manager_employee_id")
    private UUID managerEmployeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "employment_status", nullable = false, length = 40)
    private EmployeeStatus employmentStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_status", nullable = false, length = 40)
    private EmployeeQualificationStatus qualificationStatus;

    @Column(name = "joined_on")
    private LocalDate joinedOn;

    @Column(name = "last_training_date")
    private LocalDate lastTrainingDate;

    @Column(name = "next_training_due")
    private LocalDate nextTrainingDue;

    @Column(length = 1000)
    private String remarks;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
