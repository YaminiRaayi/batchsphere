package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.transactions.sampling.entity.QcInvestigationOutcome;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationPhase;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationQaReviewDecision;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationClosureCategory;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationStatus;
import com.batchsphere.core.transactions.sampling.entity.QcInvestigationType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class QcInvestigationResponse {
    UUID id;
    UUID qcDispositionId;
    UUID samplingRequestId;
    UUID sampleId;
    UUID qcTestResultId;
    String investigationNumber;
    QcInvestigationStatus status;
    QcInvestigationType investigationType;
    QcInvestigationPhase phase;
    QcInvestigationOutcome outcome;
    String reason;
    String initialAssessment;
    String phaseOneSummary;
    String phaseTwoAssessment;
    String phaseTwoSummary;
    String phaseTwoEscalatedBy;
    LocalDateTime phaseTwoEscalatedAt;
    String rootCause;
    String resolutionRemarks;
    Boolean capaRequired;
    String capaReference;
    String outcomeSubmittedBy;
    LocalDateTime outcomeSubmittedAt;
    String openedBy;
    LocalDateTime openedAt;
    String closedBy;
    LocalDateTime closedAt;
    String qaReviewRemarks;
    String qaReviewedBy;
    LocalDateTime qaReviewedAt;
    QcInvestigationQaReviewDecision qaReviewDecision;
    QcInvestigationClosureCategory closureCategory;
    String returnedToQcBy;
    LocalDateTime returnedToQcAt;
    String returnedToQcRemarks;
    String qaReviewConfirmedBy;
    String qaReviewConfirmationText;
    LocalDateTime qaReviewConfirmationAt;
    Boolean isActive;
    String createdBy;
    LocalDateTime createdAt;
    String updatedBy;
    LocalDateTime updatedAt;
}
