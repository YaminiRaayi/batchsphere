package com.batchsphere.core.lims.retentionsample.service;

import com.batchsphere.core.lims.retentionsample.dto.CreateRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.DisposeRetentionSampleRequest;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetentionSampleSummaryResponse;
import com.batchsphere.core.lims.retentionsample.dto.RetrieveRetentionSampleRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface RetentionSampleService {

    RetentionSampleResponse createRetentionSample(CreateRetentionSampleRequest request);

    RetentionSampleResponse getById(UUID id);

    Page<RetentionSampleResponse> findByFilters(String status, UUID materialId, String lotNumber, Pageable pageable);

    RetentionSampleResponse retrieveSample(UUID id, RetrieveRetentionSampleRequest request);

    RetentionSampleResponse disposeSample(UUID id, DisposeRetentionSampleRequest request);

    List<RetentionSampleResponse> findDueForDisposal();

    List<RetentionSampleResponse> findExpiringSoon(int daysAhead);

    RetentionSampleSummaryResponse getSummary();
}
