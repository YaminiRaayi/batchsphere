package com.batchsphere.core.qms.document.repository;

import com.batchsphere.core.qms.document.entity.DocumentDistribution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentDistributionRepository extends JpaRepository<DocumentDistribution, UUID> {

    List<DocumentDistribution> findByDocumentIdAndIsActiveTrueOrderByAssignedAtDesc(UUID documentId);

    List<DocumentDistribution> findByAssignedUsernameAndIsActiveTrueOrderByAssignedAtDesc(String assignedUsername);

    Optional<DocumentDistribution> findByIdAndIsActiveTrue(UUID id);

    boolean existsByRevisionIdAndAssignedUsernameAndIsActiveTrue(UUID revisionId, String assignedUsername);
}
