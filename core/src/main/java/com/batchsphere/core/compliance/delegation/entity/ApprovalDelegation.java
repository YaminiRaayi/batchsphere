package com.batchsphere.core.compliance.delegation.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "approval_delegation")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApprovalDelegation {
    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "delegator_username", nullable = false, length = 100)
    private String delegatorUsername;

    @Column(name = "delegate_username", nullable = false, length = 100)
    private String delegateUsername;

    @Column(name = "scope_entity_type", length = 100)
    private String scopeEntityType;

    @Column(name = "scope_action", length = 120)
    private String scopeAction;

    @Column(name = "valid_from", nullable = false)
    private LocalDateTime validFrom;

    @Column(name = "valid_until", nullable = false)
    private LocalDateTime validUntil;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "revoked_by", length = 100)
    private String revokedBy;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;
}
