package com.batchsphere.core.qms.document.repository;

import com.batchsphere.core.qms.document.entity.DocumentApproval;
import com.batchsphere.core.qms.document.entity.DocumentApprovalStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentApprovalRepository extends JpaRepository<DocumentApproval, UUID> {
    List<DocumentApproval> findByRevisionIdOrderByApprovalStepAsc(UUID revisionId);

    Optional<DocumentApproval> findFirstByRevisionIdAndStatusOrderByApprovalStepAsc(UUID revisionId, DocumentApprovalStatus status);
}
