package com.batchsphere.core.qms.capa.service;

import com.batchsphere.core.qms.capa.dto.CapaApproveRequest;
import com.batchsphere.core.qms.capa.dto.CapaAlertResponse;
import com.batchsphere.core.qms.capa.dto.CapaEffectivenessReviewRequest;
import com.batchsphere.core.qms.capa.dto.CapaReassignmentResponse;
import com.batchsphere.core.qms.capa.dto.CapaRejectRequest;
import com.batchsphere.core.qms.capa.dto.ReassignCapaRequest;
import com.batchsphere.core.qms.capa.dto.ScheduleEffectivenessReviewRequest;
import com.batchsphere.core.qms.capa.dto.CapaResponse;
import com.batchsphere.core.qms.capa.dto.CapaStatusUpdateRequest;
import com.batchsphere.core.qms.capa.dto.CapaSummaryResponse;
import com.batchsphere.core.qms.capa.dto.CreateCapaRequest;
import com.batchsphere.core.qms.capa.dto.UpdateCapaRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface CapaService {
    CapaResponse createCapa(CreateCapaRequest request);

    Page<CapaResponse> getAllCapas(UUID deviationId, Pageable pageable);

    CapaResponse getCapaById(UUID id);

    CapaResponse updateCapa(UUID id, UpdateCapaRequest request);

    CapaResponse updateStatus(UUID id, CapaStatusUpdateRequest request);

    CapaResponse submitForApproval(UUID id);

    CapaResponse approveCapa(UUID id, CapaApproveRequest request);

    CapaResponse rejectCapa(UUID id, CapaRejectRequest request);

    CapaResponse scheduleEffectivenessReview(UUID id, ScheduleEffectivenessReviewRequest request);

    CapaResponse reviewEffectiveness(UUID id, CapaEffectivenessReviewRequest request);

    CapaResponse reassignCapa(UUID id, ReassignCapaRequest request);

    List<CapaReassignmentResponse> getReassignmentHistory(UUID id);

    CapaSummaryResponse getSummary();

    List<CapaAlertResponse> getAlerts();
}
