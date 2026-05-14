package com.batchsphere.core.qms.capa.attachment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CapaAttachmentRepository extends JpaRepository<CapaAttachment, UUID> {
    List<CapaAttachment> findByCapaIdAndIsActiveTrueOrderByUploadedAtAsc(UUID capaId);
    Optional<CapaAttachment> findByIdAndIsActiveTrue(UUID id);
}
