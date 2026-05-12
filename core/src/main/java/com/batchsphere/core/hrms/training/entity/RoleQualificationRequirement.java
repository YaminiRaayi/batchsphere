package com.batchsphere.core.hrms.training.entity;

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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "role_qualification_requirement")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RoleQualificationRequirement {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "role_name", nullable = false, length = 80)
    private String roleName;

    @Column(name = "training_title", nullable = false, length = 255)
    private String trainingTitle;

    @Enumerated(EnumType.STRING)
    @Column(name = "training_type", nullable = false, length = 40)
    private TrainingType trainingType;

    @Column(name = "document_id")
    private UUID documentId;

    @Column(name = "revision_id")
    private UUID revisionId;

    @Column(name = "recurrence_months")
    private Integer recurrenceMonths;

    @Column(name = "is_mandatory", nullable = false)
    private Boolean isMandatory;

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
