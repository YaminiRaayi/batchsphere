package com.batchsphere.core.transactions.sampling.dto;

import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import com.batchsphere.core.transactions.sampling.entity.QcTestResultStatus;
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
    Integer sequence;
    LocalDateTime enteredAt;
    String remarks;
}
