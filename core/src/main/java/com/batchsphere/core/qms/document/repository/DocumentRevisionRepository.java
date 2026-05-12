package com.batchsphere.core.qms.document.repository;

import com.batchsphere.core.qms.document.entity.DocumentRevision;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRevisionRepository extends JpaRepository<DocumentRevision, UUID> {
    List<DocumentRevision> findByDocumentIdOrderByCreatedAtDesc(UUID documentId);

    Optional<DocumentRevision> findByIdAndDocumentId(UUID id, UUID documentId);
}
