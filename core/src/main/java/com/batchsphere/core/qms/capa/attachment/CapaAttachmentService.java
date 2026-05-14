package com.batchsphere.core.qms.capa.attachment;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface CapaAttachmentService {
    CapaAttachmentResponse uploadAttachment(UUID capaId, CapaAttachmentStage stage, MultipartFile file);
    List<CapaAttachmentResponse> listAttachments(UUID capaId);
    void removeAttachment(UUID capaId, UUID attachmentId);
    Resource downloadAttachment(UUID capaId, UUID attachmentId);
}
