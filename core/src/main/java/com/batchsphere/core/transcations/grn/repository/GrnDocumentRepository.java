package com.batchsphere.core.transcations.grn.repository;

import com.batchsphere.core.transcations.grn.entity.GrnDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface GrnDocumentRepository extends JpaRepository<GrnDocument, UUID> {
    List<GrnDocument> findByGrnItemIdAndIsActiveTrueOrderByCreatedAtDesc(UUID grnItemId);
}
