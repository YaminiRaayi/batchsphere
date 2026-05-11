package com.batchsphere.core.compliance.esign.dto;

import com.batchsphere.core.compliance.esign.entity.ESignatureVerificationMethod;
import com.batchsphere.core.compliance.esign.entity.ESignatureVerificationStatus;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class ESignatureRecordResponse {
    UUID id;
    String entityType;
    UUID entityId;
    String action;
    String meaning;
    String signerUsername;
    String signerRole;
    LocalDateTime signedAt;
    ESignatureVerificationMethod verificationMethod;
    ESignatureVerificationStatus verificationStatus;
    String reason;
}
