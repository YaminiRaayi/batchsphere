package com.batchsphere.core.lims.equipment.dto;

import com.batchsphere.core.lims.equipment.entity.QualificationResult;
import com.batchsphere.core.lims.equipment.entity.QualificationType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Value
@Builder
public class QualificationRecordResponse {

    UUID id;
    UUID equipmentId;
    QualificationType qualificationType;
    String protocolReference;
    String performedBy;
    LocalDate performedAt;
    String reviewedBy;
    LocalDate reviewedAt;
    QualificationResult result;
    String deviationNoted;
    LocalDate nextRequalificationDue;
    String calibrationCertificateNumber;
    LocalDate calibrationCertificateExpiry;
    UUID eSignatureId;
    Boolean isActive;
    String createdBy;
    OffsetDateTime createdAt;
}
