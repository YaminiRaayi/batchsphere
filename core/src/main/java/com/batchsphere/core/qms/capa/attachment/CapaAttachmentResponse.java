package com.batchsphere.core.qms.capa.attachment;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class CapaAttachmentResponse {
    UUID id;
    UUID capaId;
    CapaAttachmentStage stage;
    String fileName;
    Long fileSize;
    String mimeType;
    String uploadedBy;
    LocalDateTime uploadedAt;
}
