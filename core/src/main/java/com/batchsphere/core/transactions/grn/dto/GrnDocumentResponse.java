package com.batchsphere.core.transactions.grn.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class GrnDocumentResponse {
    UUID id;
    UUID grnItemId;
    String documentName;
    String documentType;
    String fileName;
    String documentPath;
    String documentUrl;
    String createdBy;
    LocalDateTime createdAt;
}
