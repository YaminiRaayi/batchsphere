package com.batchsphere.core.masterdata.spec.dto;

import com.batchsphere.core.masterdata.spec.entity.SpecParameterCriteriaType;
import com.batchsphere.core.masterdata.spec.entity.SpecParameterTestType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.UUID;

@Data
public class SpecParameterRequest {
    @NotBlank
    private String parameterName;

    @NotNull
    private SpecParameterTestType testType;

    private UUID moaId;

    @NotNull
    private SpecParameterCriteriaType criteriaType;

    private BigDecimal lowerLimit;
    private BigDecimal upperLimit;
    private String textCriteria;
    private String compendialChapterRef;
    private String unit;

    @NotNull
    private Boolean isMandatory;

    @NotNull
    @Min(1)
    private Integer sequence;

    private String notes;
}
