package com.batchsphere.core.compliance.esign.entity;

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
@Table(name = "e_signature_record")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ESignatureRecord {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "entity_type", nullable = false, length = 100)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private UUID entityId;

    @Column(name = "action", nullable = false, length = 120)
    private String action;

    @Column(name = "meaning", nullable = false, length = 255)
    private String meaning;

    @Column(name = "signer_username", nullable = false, length = 100)
    private String signerUsername;

    @Column(name = "signer_role", length = 50)
    private String signerRole;

    @Column(name = "signed_at", nullable = false)
    private LocalDateTime signedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_method", nullable = false, length = 50)
    private ESignatureVerificationMethod verificationMethod;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    private ESignatureVerificationStatus verificationStatus;

    @Column(name = "reason", length = 1000)
    private String reason;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;
}
