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

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "document_approval")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentApproval {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "revision_id", nullable = false)
    private UUID revisionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_step", nullable = false, length = 50)
    private DocumentApprovalStep approvalStep;

    @Column(name = "approver_role", nullable = false, length = 50)
    private String approverRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private DocumentApprovalStatus status;

    @Column(columnDefinition = "TEXT")
    private String comments;

    @Column(name = "approved_by", length = 100)
    private String approvedBy;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "e_signature_id")
    private UUID eSignatureId;
}
