package com.batchsphere.core.qms.riskassessment.service;

import com.batchsphere.core.qms.riskassessment.dto.AcceptRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.CreateRiskItemRequest;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskAssessmentSummaryResponse;
import com.batchsphere.core.qms.riskassessment.dto.RiskItemResponse;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskAssessmentRequest;
import com.batchsphere.core.qms.riskassessment.dto.UpdateRiskItemRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface RiskAssessmentService {

    RiskAssessmentResponse createRiskAssessment(CreateRiskAssessmentRequest request);

    Page<RiskAssessmentResponse> getAllRiskAssessments(Pageable pageable);

    RiskAssessmentResponse getRiskAssessmentById(UUID id);

    RiskAssessmentResponse updateRiskAssessment(UUID id, UpdateRiskAssessmentRequest request);

    RiskItemResponse addRiskItem(UUID assessmentId, CreateRiskItemRequest request);

    RiskItemResponse updateRiskItem(UUID assessmentId, UUID itemId, UpdateRiskItemRequest request);

    void deleteRiskItem(UUID assessmentId, UUID itemId);

    RiskAssessmentResponse acceptRiskAssessment(UUID id, AcceptRiskAssessmentRequest request);

    RiskAssessmentSummaryResponse getSummary();
}
