package com.batchsphere.core.qms.capa.attachment;

import com.batchsphere.core.auth.service.AuthenticatedActorService;
import com.batchsphere.core.compliance.audit.entity.AuditEventType;
import com.batchsphere.core.compliance.audit.service.AuditEventService;
import com.batchsphere.core.exception.BusinessConflictException;
import com.batchsphere.core.exception.ResourceNotFoundException;
import com.batchsphere.core.qms.capa.entity.Capa;
import com.batchsphere.core.qms.capa.entity.CapaStatus;
import com.batchsphere.core.qms.capa.repository.CapaRepository;
import com.batchsphere.core.storage.LocalStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CapaAttachmentServiceImpl implements CapaAttachmentService {

    private final CapaAttachmentRepository attachmentRepository;
    private final CapaRepository capaRepository;
    private final LocalStorageService storageService;
    private final AuthenticatedActorService authenticatedActorService;
    private final AuditEventService auditEventService;

    @Override
    @Transactional
    public CapaAttachmentResponse uploadAttachment(UUID capaId, CapaAttachmentStage stage, MultipartFile file) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(capaId);
        if (capa.getStatus() == CapaStatus.CLOSED || capa.getStatus() == CapaStatus.CANCELLED) {
            throw new BusinessConflictException("Cannot add evidence to a closed or cancelled CAPA");
        }
        String storedPath = storageService.store("capa", "attachments/" + capaId, file);
        CapaAttachment attachment = CapaAttachment.builder()
                .id(UUID.randomUUID())
                .capaId(capaId)
                .stage(stage)
                .fileName(file.getOriginalFilename() == null ? "document" : file.getOriginalFilename())
                .storedPath(storedPath)
                .fileSize(file.getSize())
                .mimeType(file.getContentType())
                .uploadedBy(actor)
                .uploadedAt(LocalDateTime.now())
                .isActive(true)
                .build();
        CapaAttachment saved = attachmentRepository.save(attachment);
        auditEventService.record("QMS_CAPA", capaId, AuditEventType.UPDATE, "attachment",
                null, saved.getId().toString(), "Evidence uploaded: " + saved.getFileName() + " [" + stage + "]", actor, "QMS_CAPA");
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CapaAttachmentResponse> listAttachments(UUID capaId) {
        getActiveCapa(capaId);
        return attachmentRepository.findByCapaIdAndIsActiveTrueOrderByUploadedAtAsc(capaId)
                .stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional
    public void removeAttachment(UUID capaId, UUID attachmentId) {
        String actor = authenticatedActorService.currentActor();
        Capa capa = getActiveCapa(capaId);
        if (capa.getStatus() == CapaStatus.CLOSED || capa.getStatus() == CapaStatus.CANCELLED) {
            throw new BusinessConflictException("Cannot remove evidence from a closed or cancelled CAPA");
        }
        CapaAttachment attachment = attachmentRepository.findByIdAndIsActiveTrue(attachmentId)
                .filter(a -> a.getCapaId().equals(capaId))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
        attachment.setIsActive(false);
        attachmentRepository.save(attachment);
        auditEventService.record("QMS_CAPA", capaId, AuditEventType.UPDATE, "attachment",
                attachmentId.toString(), null, "Evidence removed: " + attachment.getFileName(), actor, "QMS_CAPA");
    }

    @Override
    @Transactional(readOnly = true)
    public Resource downloadAttachment(UUID capaId, UUID attachmentId) {
        getActiveCapa(capaId);
        CapaAttachment attachment = attachmentRepository.findByIdAndIsActiveTrue(attachmentId)
                .filter(a -> a.getCapaId().equals(capaId))
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found: " + attachmentId));
        return storageService.loadAsResource(attachment.getStoredPath());
    }

    private Capa getActiveCapa(UUID id) {
        return capaRepository.findByIdAndIsActiveTrue(id)
                .orElseThrow(() -> new ResourceNotFoundException("CAPA not found: " + id));
    }

    private CapaAttachmentResponse toResponse(CapaAttachment a) {
        return CapaAttachmentResponse.builder()
                .id(a.getId())
                .capaId(a.getCapaId())
                .stage(a.getStage())
                .fileName(a.getFileName())
                .fileSize(a.getFileSize())
                .mimeType(a.getMimeType())
                .uploadedBy(a.getUploadedBy())
                .uploadedAt(a.getUploadedAt())
                .build();
    }
}
