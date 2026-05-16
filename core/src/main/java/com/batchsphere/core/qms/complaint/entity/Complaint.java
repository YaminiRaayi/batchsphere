package com.batchsphere.core.qms.complaint.entity;

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
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "complaint")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Complaint {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "complaint_number", nullable = false, unique = true, length = 30)
    private String complaintNumber;

    @Column(name = "received_date", nullable = false)
    private LocalDate receivedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComplaintSource source;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComplaintCategory category;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ComplaintSeverity severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ComplaintStatus status;

    @Column(name = "product_name", length = 255)
    private String productName;

    @Column(name = "lot_number", length = 100)
    private String lotNumber;

    @Column(name = "reported_by", length = 255)
    private String reportedBy;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "initial_assessment", columnDefinition = "TEXT")
    private String initialAssessment;

    @Column(name = "root_cause", columnDefinition = "TEXT")
    private String rootCause;

    @Column(name = "impact_assessment", columnDefinition = "TEXT")
    private String impactAssessment;

    @Column(name = "recall_required")
    private Boolean recallRequired;

    @Enumerated(EnumType.STRING)
    @Column(name = "regulatory_reportability", length = 20)
    private RegulatoryReportability regulatoryReportability;

    @Column(name = "regulatory_report_date")
    private LocalDate regulatoryReportDate;

    @Column(name = "regulatory_authority", length = 100)
    private String regulatoryAuthority;

    @Column(name = "linked_deviation_id")
    private UUID linkedDeviationId;

    @Column(name = "linked_capa_id")
    private UUID linkedCapaId;

    @Column(name = "closed_by", length = 100)
    private String closedBy;

    @Column(name = "closed_at")
    private OffsetDateTime closedAt;

    @Column(name = "closure_summary", columnDefinition = "TEXT")
    private String closureSummary;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
