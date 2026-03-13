package com.batchsphere.core.batch.service;

import com.batchsphere.core.batch.dto.BatchRequest;
import com.batchsphere.core.batch.dto.BatchTransitionRequest;
import com.batchsphere.core.batch.entity.Batch;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface BatchService {
    Batch createBatch(BatchRequest request);
    Batch transitionBatchStatus(UUID id, BatchTransitionRequest transitionRequest);
    Batch getBatchById(UUID id);
    Page<Batch> getAllBatches(Pageable pageable);
    void deactivateBatch(UUID id);
}
