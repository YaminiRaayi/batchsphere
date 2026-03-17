package com.batchsphere.core.transcations.grn.dto;

import com.batchsphere.core.transcations.grn.entity.LabelStatus;
import com.batchsphere.core.transcations.grn.entity.LabelType;
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
    String generatedBy;
    LocalDateTime generatedAt;
    String appliedBy;
    LocalDateTime appliedAt;
}
