package com.batchsphere.core.lims.equipment.entity;

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
@Table(name = "equipment_qualification_record")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EquipmentQualificationRecord {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "equipment_id", nullable = false)
    private UUID equipmentId;

    @Enumerated(EnumType.STRING)
    @Column(name = "qualification_type", nullable = false)
    private QualificationType qualificationType;

    @Column(name = "protocol_reference", nullable = false, length = 255)
    private String protocolReference;

    @Column(name = "performed_by", nullable = false, length = 100)
    private String performedBy;

    @Column(name = "performed_at", nullable = false)
    private LocalDate performedAt;

    @Column(name = "reviewed_by", length = 100)
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDate reviewedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QualificationResult result;

    @Column(name = "deviation_noted", columnDefinition = "TEXT")
    private String deviationNoted;

    @Column(name = "next_requalification_due")
    private LocalDate nextRequalificationDue;

    @Column(name = "calibration_certificate_number", length = 255)
    private String calibrationCertificateNumber;

    @Column(name = "calibration_certificate_expiry")
    private LocalDate calibrationCertificateExpiry;

    @Column(name = "e_signature_id")
    private UUID eSignatureId;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @Column(name = "created_by", nullable = false, length = 100)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
