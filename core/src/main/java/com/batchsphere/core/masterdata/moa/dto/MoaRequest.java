package com.batchsphere.core.masterdata.moa.dto;

import com.batchsphere.core.masterdata.moa.entity.MoaType;
import com.batchsphere.core.masterdata.moa.entity.MoaValidationStatus;
import com.batchsphere.core.masterdata.moa.entity.SampleSolutionStabilityUnit;
import com.batchsphere.core.masterdata.quality.enums.CompendialRef;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class MoaRequest {
    @NotBlank
    private String moaCode;
    @NotBlank
    private String moaName;
    private String revision;
    private MoaType moaType;
    private String principle;
    private CompendialRef compendialRef;
    private String instrumentType;
    private String reagentsAndStandards;
    private String systemSuitabilityCriteria;
    private String calculationFormula;
    private String reportableRange;
    private String referenceAttachment;
    private String validationReferenceNo;
    private String validationAttachment;
    private BigDecimal sampleSolutionStabilityValue;
    private SampleSolutionStabilityUnit sampleSolutionStabilityUnit;
    private String sampleSolutionStabilityCondition;
    private MoaValidationStatus validationStatus;
    private ReviewRoute reviewRoute;
    @NotBlank
    private String createdBy;
}
