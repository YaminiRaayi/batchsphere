package com.batchsphere.core.qms.document.entity;

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
@Table(name = "document_distribution")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentDistribution {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(name = "revision_id", nullable = false)
    private UUID revisionId;

    @Column(name = "assigned_username", nullable = false, length = 100)
    private String assignedUsername;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentDistributionStatus status;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "assigned_by", nullable = false, length = 100)
    private String assignedBy;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "acknowledged_by", length = 100)
    private String acknowledgedBy;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledgement_e_signature_id")
    private UUID acknowledgementESignatureId;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
