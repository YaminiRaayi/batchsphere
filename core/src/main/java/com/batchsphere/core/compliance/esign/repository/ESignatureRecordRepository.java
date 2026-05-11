package com.batchsphere.core.compliance.esign.repository;

import com.batchsphere.core.compliance.esign.entity.ESignatureRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ESignatureRecordRepository extends JpaRepository<ESignatureRecord, UUID> {
    List<ESignatureRecord> findByEntityTypeAndEntityIdAndIsActiveTrueOrderBySignedAtDesc(String entityType, UUID entityId);
}
