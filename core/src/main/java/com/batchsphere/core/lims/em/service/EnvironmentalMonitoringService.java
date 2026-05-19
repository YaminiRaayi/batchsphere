package com.batchsphere.core.lims.em.service;

import com.batchsphere.core.lims.em.dto.EmDtos.CreateMonitoringPointRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.DismissBreachRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.EmResultResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.LinkBreachDeviationRequest;
import com.batchsphere.core.lims.em.dto.EmDtos.MonitoringPointResponse;
import com.batchsphere.core.lims.em.dto.EmDtos.RecordEmResultRequest;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface EnvironmentalMonitoringService {
    List<MonitoringPointResponse> listPoints();
    MonitoringPointResponse createPoint(CreateMonitoringPointRequest request);
    EmResultResponse recordResult(RecordEmResultRequest request);
    List<EmResultResponse> listResults(UUID pointId, LocalDate from, LocalDate to);
    List<EmResultResponse> breaches();
    EmResultResponse linkDeviation(UUID resultId, LinkBreachDeviationRequest request);
    EmResultResponse dismissBreach(UUID resultId, DismissBreachRequest request);
}
