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
@Table(name = "document_revision")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentRevision {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "document_id", nullable = false)
    private UUID documentId;

    @Column(nullable = false, length = 30)
    private String revision;

    @Enumerated(EnumType.STRING)
    @Column(name = "revision_status", nullable = false, length = 40)
    private DocumentRevisionStatus revisionStatus;

    @Column(name = "change_summary", nullable = false, columnDefinition = "TEXT")
    private String changeSummary;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    @Column(name = "superseded_at")
    private LocalDateTime supersededAt;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "submitted_by", length = 100)
    private String submittedBy;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
}
