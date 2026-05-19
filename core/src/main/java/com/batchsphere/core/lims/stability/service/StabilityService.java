package com.batchsphere.core.lims.stability.service;

import com.batchsphere.core.lims.stability.dto.StabilityDtos.CreateStabilityStudyRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.PullTimepointRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.RecordStabilityResultRequest;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityResultResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudyDetailResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityStudySummaryResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.StabilityTimepointResponse;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.TrendSeries;
import com.batchsphere.core.lims.stability.dto.StabilityDtos.UpdateStabilityStatusRequest;

import java.util.List;
import java.util.UUID;

public interface StabilityService {
    StabilityStudyDetailResponse createStudy(CreateStabilityStudyRequest request);
    List<StabilityStudySummaryResponse> listStudies();
    StabilityStudyDetailResponse getStudy(UUID id);
    StabilityTimepointResponse pullTimepoint(UUID studyId, UUID timepointId, PullTimepointRequest request);
    StabilityResultResponse recordResult(UUID studyId, UUID timepointId, RecordStabilityResultRequest request);
    List<StabilityTimepointResponse> dueSoon(int days);
    List<TrendSeries> trend(UUID studyId);
    StabilityStudySummaryResponse updateStatus(UUID id, UpdateStabilityStatusRequest request);
}
