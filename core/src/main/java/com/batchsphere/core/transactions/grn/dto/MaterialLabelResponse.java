package com.batchsphere.core.transactions.grn.dto;

import com.batchsphere.core.transactions.grn.entity.LabelStatus;
import com.batchsphere.core.transactions.grn.entity.LabelType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class MaterialLabelResponse {
    UUID id;
    UUID grnContainerId;
    LabelType labelType;
    LabelStatus labelStatus;
    String labelContent;
    String qrPayload;
    String qrCodeDataUrl;
    String generatedBy;
    LocalDateTime generatedAt;
    String appliedBy;
    LocalDateTime appliedAt;
}
