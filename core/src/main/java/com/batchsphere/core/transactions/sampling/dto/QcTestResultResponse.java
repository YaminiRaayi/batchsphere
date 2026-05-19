package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
import com.batchsphere.core.transactions.sampling.entity.QcWorksheetStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Value
@Builder
public class QcTestResultResponse {
    UUID id;
    UUID sampleId;
    UUID worksheetId;
    UUID samplingRequestId;
    UUID specId;
    QcWorksheetStatus worksheetStatus;
    String assignedAnalyst;
    String worksheetReviewer;
    LocalDateTime worksheetGeneratedAt;
    UUID specParameterId;
    UUID moaIdUsed;
    String moaCodeUsed;
    String analystCode;
    String parameterName;
    SpecParameterTestType testType;
    String specMoaCode;
    UUID specMoaId;
    BigDecimal resultValue;
    String resultText;
    QcTestResultStatus status;
    Boolean passFailFlag;
    BigDecimal lowerLimitApplied;
    BigDecimal upperLimitApplied;
    SpecParameterCriteriaType criteriaTypeApplied;
    String unitApplied;
    String criteriaDisplay;
    Boolean mandatory;
    Boolean requiresInstrument;
    Integer sequence;
    LocalDateTime enteredAt;
    String remarks;
    Boolean isLocked;
    UUID equipmentId;
    String instrumentRef;
    UUID reagentLotId;
}
