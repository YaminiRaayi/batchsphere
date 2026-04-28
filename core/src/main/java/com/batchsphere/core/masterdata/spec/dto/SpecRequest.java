package com.batchsphere.core.masterdata.spec.dto;

import com.batchsphere.core.masterdata.quality.enums.CompendialRef;
import com.batchsphere.core.masterdata.quality.enums.ReviewRoute;
import com.batchsphere.core.masterdata.spec.entity.SpecType;
import com.batchsphere.core.masterdata.spec.entity.TargetMarket;
import com.batchsphere.core.transactions.sampling.entity.SamplingMethod;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
public class SpecRequest {
    @NotBlank
    private String specCode;
    @NotBlank
    private String specName;
    private String revision;
    @NotNull
    private SpecType specType;
    @NotNull
    private SamplingMethod samplingMethod;
    private TargetMarket targetMarket;
    private LocalDate effectiveDate;
    private LocalDate expiryDate;
    private CompendialRef compendialRef;
    private String compendialEdition;
    private String referenceDocumentNo;
    private String referenceAttachment;
    private ReviewRoute reviewRoute;
    private List<UUID> materialIds;
    @NotBlank
    private String createdBy;
}
